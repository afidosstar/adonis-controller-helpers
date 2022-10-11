/*
 * @created 11/10/2022 - 18:00
 * @project adonis-controller-helpers
 * @author afidos
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module "@ioc:Adonis/Src/ControllerHelper" {
  import { DatabaseQueryBuilderContract } from "@ioc:Adonis/Lucid/Database";
  import { ModelQueryBuilderContract } from "@ioc:Adonis/Lucid/Orm";
  export type QueryBuilderContract =
    | ModelQueryBuilderContract<any>
    | DatabaseQueryBuilderContract<any>;
}
