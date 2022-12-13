/*
 * @created 12/10/2022 - 08:17
 * @project adonis-controller-helpers
 * @author afidos
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { TransactionClientContract } from "@ioc:Adonis/Lucid/Database";
import { ServiceContract } from "@ioc:Adonis/Addons/ControllerHelper";

export default abstract class Service implements ServiceContract {
  constructor(
    protected trx?: TransactionClientContract,
    protected user?: any,
    protected event?: any
  ) {}
  public abstract execute(payload?: Record<string, any>): Promise<any>;
}
