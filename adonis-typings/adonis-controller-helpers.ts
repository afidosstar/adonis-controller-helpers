/*
 * @created 11/10/2022 - 18:00
 * @project adonis-controller-helpers
 * @author afidos
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module "@ioc:Adonis/Addons/ControllerHelper" {
  import {
    DatabaseContract,
    DatabaseQueryBuilderContract,
  } from "@ioc:Adonis/Lucid/Database";
  import { ModelQueryBuilderContract } from "@ioc:Adonis/Lucid/Orm";
  interface WrapIgnoreContract {
    readonly data;
  }

  export interface ServiceContract {
    execute(payload?: Record<string, any>): Promise<any>;
  }

  export type QueryBuilderContract =
    | ModelQueryBuilderContract<any>
    | DatabaseQueryBuilderContract<any>;
  export interface ControllerHelperContract {}
  export interface ControllerHelperStaticContract {
    new (): ControllerHelperContract;

    search(
      query: ModelQueryBuilderContract<any>,
      pagination,
      filter,
      populates,
      selects
    ): Promise<WrapIgnoreContract>;

    populates(
      query: ModelQueryBuilderContract<any>,
      payload
    ): ModelQueryBuilderContract<any>;

    searchPayload(
      query: ModelQueryBuilderContract<any>,
      payload
    ): Promise<WrapIgnoreContract>;

    searchDatabasePayload(
      query: DatabaseQueryBuilderContract<any>,
      payload
    ): Promise<WrapIgnoreContract>;

    buildQuery(
      query: DatabaseContract,
      callback: (query: DatabaseContract) => DatabaseQueryBuilderContract<any>,
      name: string
    ): DatabaseQueryBuilderContract<any>;

    searchDatabase(
      query: DatabaseQueryBuilderContract<any>,
      pagination,
      filter,
      selects
    ): Promise<WrapIgnoreContract>;

    selects(query: QueryBuilderContract, payload: Record<string, any>): void;

    paginateModel(
      query: ModelQueryBuilderContract<any>,
      page,
      perPage
    ): Promise<Array<Record<string, any>>>;

    paginate(
      query: ModelQueryBuilderContract<any> | DatabaseQueryBuilderContract<any>,
      page,
      perPage
    ): Promise<Array<Record<string, any>>>;

    generateEqualCond(
      query: QueryBuilderContract,
      ids: Array<number>,
      prop: string
    ): void;

    trans(query: QueryBuilderContract, transaction): QueryBuilderContract;
  }
  const ControllerHelper: ControllerHelperStaticContract;
  const Service: ServiceContract;
  export default ControllerHelper;
  export { Service };
}
