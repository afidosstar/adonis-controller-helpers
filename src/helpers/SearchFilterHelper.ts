import * as _ from "lodash";
import { ModelQueryBuilderContract } from "@ioc:Adonis/Lucid/Orm";
import Database, {
  DatabaseQueryBuilderContract,
} from "@ioc:Adonis/Lucid/Database";
import camelCase from "lodash/camelCase";

_.pascalCase = (...args) => _.upperFirst(_.camelCase(...args));

/**
 * @class
 *  {
        "type":"operator",
        "operand": "and",// and || or
        "value": [
            {
                "type":"condition",
                "field": "first_name",
                "operand": "",
                "value":"jean"
            },
            {
                "type": "condition",
                "field": "last_name",
                "operand": "contains",
                "value": "DOGLASE"
            }
        ]
    }
 */
export default class SearchFilterHelper {
  public whereBuilder(query, operator) {
    let isCalledFirstWhere = false;

    return (suffix = "", ...arg) => {
      // fix write condition
      if (typeof arg[0] === "string" && /-/.test(arg[0])) {
        arg[0] = Database.raw(`(${arg[0]})::varchar`);
      }

      if (!isCalledFirstWhere) {
        isCalledFirstWhere = true;
        return query["where" + _.pascalCase(suffix)](...arg);
      }
      // andWhereHas or orWhereHas not exist
      if ((suffix || "").toLowerCase() === "has") {
        return query[this.getMethod(operator)]((qb) =>
          qb[this.getMethod("") + _.pascalCase(suffix)](...arg)
        );
      }
      if (["null", "notnull"].includes((suffix || "").toLowerCase())) {
        return query[this.getMethod("") + _.pascalCase(suffix)](...arg);
      }
      console.log(
        "Method",
        operator,
        this.getMethod(operator) + _.pascalCase(suffix)
      );
      return query[this.getMethod(operator) + _.pascalCase(suffix)](...arg);
    };
  }
  public static build(
    query: ModelQueryBuilderContract<any> | DatabaseQueryBuilderContract<any>,
    pagination,
    filter
  ) {
    pagination = Object(pagination);
    const search = new SearchFilterHelper();
    search.compose(query, filter, pagination.sortBy, pagination.descending);
  }

  public compose(query, filter, sortBy, descending) {
    if (Object(filter) === filter)
      this.builder(this.whereBuilder(query, filter.operand), filter);

    if (sortBy && !this.isDeep(sortBy)) {
      query.clearOrder();
      query.orderBy(sortBy, descending ? "DESC" : "ASC");
    }
    return query;
  }

  public builder(where, filter) {
    switch (filter.type) {
      case "operator":
        where("", (builder) => {
          const subWhere = this.whereBuilder(builder, filter.operand);
          Array.from(filter.value).forEach((row) => {
            this.builder(subWhere, row);
          });
        });
        break;

      case "condition":
        const value = this.getValue(filter.operand, filter.value);
        if (!value) break;
        const descriptor = this.getAccessor(filter.field);
        const operand = this.getOperator(filter.operand);
        if (descriptor.relation) {
          const paths = descriptor.relation.split(".");
          const firstRelations = paths.shift();
          // composition function for apply
          // gof(x) in mathematics
          if (paths.length) {
            where(
              "has",
              camelCase(firstRelations),
              (builder) => {
                const reversePaths = paths.reverse();

                reversePaths.reduce(
                  (acc, path) => {
                    return function (qb) {
                      qb.whereHas(camelCase(path), acc, ">=", 1);
                    };
                  },
                  function (qb) {
                    qb.where(descriptor.name, operand, value);
                  }
                )(builder);
              },
              ">=",
              1
            );
          } else {
            where(
              "has",
              firstRelations,
              (builder) => {
                builder.where(descriptor.name, operand, value);
              },
              ">=",
              1
            );
          }
        } else if (_.isNull(value)) {
          where(operand === "=" ? "Null" : "NotNull", descriptor.name, operand);
        } else if (["Null", "NotNull"].includes(operand)) {
          where(operand, descriptor.name, operand);
        } else {
          where("", descriptor.name, operand, value);
        }
        break;
    }
  }

  public isDeep(field) {
    return /\./.test(field);
  }

  public getOperator(operand) {
    switch (operand) {
      case "in":
        return "in";
      case "between":
        return "between";

      case "neq":
      case "ne":
      case "not-equal":
      case "!=":
        return "<>";

      case "eq":
      case "equals":
      case "equal":
      case "=":
        return "=";

      case "like":
      case "%":
      case "contains":
      case "start":
      case "end":
        return "ilike";
      case "not_contains":
      case "not-contains":
        return "not ilike";
      case "lt":
      case "<":
        return "<";
      case "gt":
      case ">":
        return ">";

      case "lte":
      case "<=":
        return "<=";

      case "gte":
      case ">=":
        return ">=";

      case "is_null":
      case "is-null":
        return "Null";

      case "is_not_null":
      case "is-not-null":
        return "NotNull";

      default:
        return "ilike";
    }
  }

  public getValue(operand, value) {
    switch (operand) {
      case "in":
        return Array.isArray(value) ? value : [value];

      case "neq":
      case "not-equal":
      case "ne":
      case "equal":
      case "equals":
      case "!=":
      case "<>":
      case "eq":
      case "lt":
      case "gt":
      case "lte":
      case "gte":
      case "<=":
      case ">=":
      case "<":
      case ">":
      case "=":
        return value;

      case "like":
      case "%":
      case "contains":
      case "not_contains":
      case "not-contains":
      default:
        return `%${value || ""}%`;

      case "start":
        return `${value || ""}%`;

      case "end":
        return `%${value || ""}`;
    }
  }

  public getAccessor(value) {
    const temp = value.split(".");
    const name = temp.pop();
    return { relation: temp.join("."), name };
  }

  public getMethod(operator) {
    operator = (operator || "").toLowerCase().trim();
    return ["and", "or", "xor"].includes(operator)
      ? `${operator}Where`
      : "where";
  }
}
