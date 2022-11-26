import { ApplicationContract } from "@ioc:Adonis/Core/Application";
import { WrapIgnore } from "../src/helpers/wrap-ignore";
import { Exception } from "@poppinss/utils";
import merge from "lodash/merge";

export default class ControllerHelperProvider {
  public static needsApplication = true;
  constructor(protected app: ApplicationContract) {}

  public register() {
    // Register your own bindings
    this.app.container.bind("Adonis/Addons/ControllerHelper", () => {
      return require("../src/helpers/ControllerHelper");
    });
    this.app.container.singleton("Adonis/Addons/SearchFilterHelper", () => {
      return require("../src/helpers/SearchFilterHelper");
    });
  }

  public async boot() {
    const Request = this.app.container.use("Adonis/Core/Request");
    const { schema, validator } = this.app.container.use(
      "Adonis/Core/Validator"
    );
    const Response = this.app.container.use("Adonis/Core/Response");
    // IoC container is ready
    // register Honeypot component to Edge
    Request.macro("checkInputs", async function (rule) {
      const body = this.all();
      let payload = merge(body, this.params(), this.allFiles());
      let realRule = typeof rule === "function" ? rule(payload) : rule;
      console.log("payload", payload);
      //fix bug parameters not validate.
      if (realRule && !ControllerHelperProvider.isEmpty(realRule)) {
        payload = {
          ...(await validator.validate({
            schema: schema.create(realRule),
            data: payload,
          })),
          ...this.params(),
        };
        console.log("validated", payload);
      }
      return payload;
    });
    Response.macro("apiView", async function (result) {
      if (result instanceof Error) {
        const httpCode = (result as any).httpCode || 500;
        return this.status(httpCode).json({ status: httpCode, error: result });
      } else if (result instanceof WrapIgnore) {
        return this.status(200).json(result.data);
      } else if (result instanceof Exception) {
        throw result;
      } else if (ControllerHelperProvider.isEmpty(result)) {
        console.log("result", result);
        return this.status(204);
      } else return this.status(200).json({ status: 200, data: result });
    });
  }

  private static isEmpty(obj) {
    if (typeof obj === "undefined" || obj === null) {
      return true;
    }
    if (Array.isArray(obj)) {
      return false;
    }
    if (typeof obj === "object") return Object.keys(obj).length === 0;

    return false;
  }
}
