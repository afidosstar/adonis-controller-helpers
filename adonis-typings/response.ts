/*
 * @created 11/10/2022 - 20:14
 * @project adonis-controller-helpers
 * @author afidos
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module "@ioc:Adonis/Core/Response" {
  interface ResponseContract {
    apiView(result: any, message?: string): object;
  }
}
