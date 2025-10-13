/*
 *  Copyright (c) 2022.
 *  @created 17/10/2022 - 16:33:6
 *  @project adonis-controller-helpers
 *  @author "fiacre.ayedoun@gmail.com"
 *
 *  For the full copyright and license information, please view the LICENSE
 *  file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />
import SearchFilterHelper from "./SearchFilterHelper";
import {
  DatabaseContract,
  DatabaseQueryBuilderContract,
} from "@ioc:Adonis/Lucid/Database";
import { ModelQueryBuilderContract } from "@ioc:Adonis/Lucid/Orm";
import { WrapIgnore } from "./wrap-ignore";
import {
  ControllerHelperContract,
  QueryBuilderContract,
} from "@ioc:Adonis/Addons/ControllerHelper";
import camelCase from "lodash/camelCase";
import _ from "lodash";

function reverseFlat(populates) {
  const data = populates.reduce((acc, row) => {
    _.set(acc, row, null);
    return acc;
  }, {});

  return Object.entries(data).map(function recurseMap([key, value]) {
    if (value) {
      return [key].concat(Object.entries(value).map(recurseMap));
    }
    return key;
  });
}

function compose(
  query: ModelQueryBuilderContract<any>,
  value: string[] | string
) {
  if (!Array.isArray(value)) {
    return query.preload(camelCase(value), undefined);
  }
  const first: string = value.shift() as string;
  query.preload(camelCase(first), function (qb) {
    for (const row of value) {
      compose(qb, row);
    }
  });
}

/**
 * @type Error
 */

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */

export default class ControllerHelper implements ControllerHelperContract {
  private static parse(value) {
    try {
      if (!value) return null;
      return typeof value === "string" ? JSON.parse(value) : value;
    } catch (e) {
      console.log("parse error", e);
      return null;
    }
  }
  /**
   *
   * @param query
   * @param pagination
   * @param filter
   * @param populates
   * @param selects
   */
  public static async search(
    query: ModelQueryBuilderContract<any>,
    pagination,
    filter,
    populates,
    selects
  ) {
    filter = this.parse(filter);

    pagination = this.parse(pagination);

    this.populates(query, { populates });

    this.selects(query, { selects });

    SearchFilterHelper.build(query, pagination, filter);
    if (pagination?.page) {
      return new WrapIgnore(
        (await ControllerHelper.paginateModel(
          query,
          pagination.page,
          pagination.rowsPerPage
        )) as any
      );
    }
    return new WrapIgnore({ data: await query });
  }

  public static populates(query: ModelQueryBuilderContract<any>, payload) {
    const { populates } = payload;
    if (!Array.isArray(payload.populates)) return query;
    reverseFlat(populates).forEach((row) => compose(query, row));
    // populates.forEach((row) => {
    //   const field = row.trim();
    //   const paths = field.split(".").reverse();
    //   // composition function for apply
    //   // gof(x) in mathematics
    //   const gof = paths.reduce((acc, path) => {
    //     return function (subQuery) {
    //       subQuery.preload(camelCase(path), acc);
    //     };
    //   }, undefined);
    //   gof(query);
    // });
    return query;
  }

  public static searchPayload(query: ModelQueryBuilderContract<any>, payload) {
    return ControllerHelper.search(
      query,
      payload.pagination,
      payload.filter,
      payload.populates,
      payload.selects
    );
  }
  public static searchDatabasePayload(
    query: DatabaseQueryBuilderContract<any>,
    payload
  ) {
    return ControllerHelper.searchDatabase(
      query,
      payload.pagination,
      payload.filter,
      payload.populates
    );
  }

  public static buildQuery(
    query: DatabaseContract,
    callback: (query: DatabaseContract) => DatabaseQueryBuilderContract<any>,
    name: string = "query"
  ): DatabaseQueryBuilderContract<any> {
    return query.query().from(callback(query).as(name));
  }

  public static async searchDatabase(
    query: DatabaseQueryBuilderContract<any>,
    pagination,
    filter,
    selects
  ) {
    filter = this.parse(filter);
    pagination =
      typeof pagination === "string"
        ? JSON.parse(pagination)
        : Object(pagination);
    this.selects(query, { selects });
    SearchFilterHelper.build(query, pagination, filter);
    if (pagination.page) {
      return new WrapIgnore(
        await ControllerHelper.paginate(
          query,
          pagination.page,
          pagination.rowsPerPage
        )
      );
    }
    return new WrapIgnore({ data: await query });
  }

  public static selects(
    query: QueryBuilderContract,
    payload: Record<string, any>
  ) {
    const { selects } = payload;
    if (!Array.isArray(selects)) return query;
    query.select(selects);
  }

  public static async paginateModel(
    query: ModelQueryBuilderContract<any>,
    page,
    perPage
  ) {
    if (/count/.test(query.toString())) {
      const Database = await ControllerHelper.getDatabase();
      // @ts-ignore
      const { rows } = await Database.raw(`SELECT COUNT(*) ::int as count
                                         FROM (${query
                                           .clone()
                                           .clearOrder()
                                           .toString()}) as tableCount limit 1`);
      const [data] = rows;
      if (parseInt(page) < 1) page = 1;
      const offset = (page - 1) * perPage;
      const results =
        (perPage === 0
          ? await query
          : await query.limit(perPage).offset(offset)) || [];
      return {
        data: results,
        meta: {
          page: page,
          per_page: perPage,
          total: data.count,
          last_page: Math.ceil(data.count / perPage),
        },
      };
    }
    return (
      await query.paginate(page, perPage || Number.MAX_SAFE_INTEGER)
    ).toJSON();
  }

  public static async paginate(
    query: ModelQueryBuilderContract<any> | DatabaseQueryBuilderContract<any>,
    page,
    perPage
  ) {
    if (/count/.test(query.toString())) {
      const Database = await ControllerHelper.getDatabase();
      // @ts-ignore
      const { rows } = await Database.raw(`SELECT COUNT(*) ::int as count
                                         FROM (${query
                                           .clone()
                                           .clearOrder()
                                           .toString()}) as tableCount limit 1`);
      const [data] = rows;
      if (parseInt(page) < 1) page = 1;
      return {
        data:
          (perPage === 0
            ? await query
            : await query.limit(perPage).offset((page - 1) * perPage)) || [],
        meta: {
          page: page,
          per_page: perPage,
          total: data.count,
          last_page: Math.ceil(data.count / perPage),
        },
      };
    }
    return (
      await query.paginate(page, perPage || Number.MAX_SAFE_INTEGER)
    ).toJSON();
  }

  /**
   *
   * @param query
   * @param ids
   * @param prop
   */
  public static generateEqualCond(query, ids, prop) {
    const copyIds = [...ids];
    query.where((qb) => {
      if (copyIds.length > 0) qb.where(prop, copyIds.pop());
      copyIds.forEach((id) => qb.orWhere(prop, id));
    });
  }

  public static trans(query, transaction) {
    return transaction ? query.transacting(transaction) : query;
  }

  private static async getDatabase(): Promise<DatabaseContract> {
    return (await import("@ioc:Adonis/Lucid/Database")).default;
  }
}

module.exports = ControllerHelper;
