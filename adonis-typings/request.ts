/*
 * @created 11/10/2022 - 20:15
 * @project adonis-controller-helpers
 * @author afidos
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module "@ioc:Adonis/Core/Request" {
  import { TypedSchema } from "@ioc:Adonis/Core/Validator";

  export type CheckValidator<T> = (payload: Record<string, any>) => T;
  interface RequestContract {
    checkInputs<T extends TypedSchema>(
      rule?: CheckValidator<T> | T,
      messages?: CheckValidator<Record<string, any>> | Record<string, any>
    ): Promise<Record<string, any>>;
  }
}
