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
      // andWhereHas/orWhereHas existent, mais pas andWhereDoesntHave (seuls
      // whereDoesntHave et orWhereDoesntHave existent côté Lucid) : on
      // repasse par un callback and/orWhere pour les deux verbes.
      if (["has", "doesnthave"].includes((suffix || "").toLowerCase())) {
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
          (Array.isArray(filter.value) ? filter.value : []).forEach((row) => {
            this.builder(subWhere, row);
          });
        });
        break;

      case "condition":
        const value = this.getValue(filter.operand, filter.value);
        // Ne pas confondre "valeur absente" avec une valeur légitimement
        // falsy (`false`, `0`) : seules `undefined` et la chaîne vide
        // signifient "aucun filtre saisi". `null` reste géré plus bas
        // (`_.isNull(value)`), comportement inchangé.
        if (value === undefined || value === "") break;
        const descriptor = this.getAccessor(filter.field);
        const operand = this.getOperator(filter.operand);
        // Cast la colonne en TEXT pour autoriser ILIKE sur des colonnes non textuelles
        // (ex: integer). PostgreSQL optimise le cast sur les colonnes déjà textuelles.
        const column = ["ilike", "not ilike"].includes(operand)
          ? Database.raw(`CAST("${descriptor.name}" AS TEXT)`)
          : descriptor.name;
        if (descriptor.relation) {
          const paths = descriptor.relation.split(".");
          const firstRelations = paths.shift();
          // `is-null`/`is-not-null` sur un champ relationnel : un simple
          // whereHas(relation, whereNull(champ)) exigerait qu'une ligne
          // liée existe, ce qui exclut justement "aucune ligne liée" — le
          // sens réel de "vide" attendu par l'utilisateur. On bascule le
          // verbe englobant sur `doesntHave` pour is-null (aucune ligne
          // liée avec ce champ renseigné), on garde `has` pour is-not-null.
          const isNullOperand = operand === "Null" || operand === "NotNull";
          const outerVerb = operand === "Null" ? "doesntHave" : "has";
          const leaf = isNullOperand
            ? (qb) => qb.whereNotNull(column)
            : (qb) => qb.where(column, operand, value);
          // composition function for apply
          // gof(x) in mathematics
          if (paths.length) {
            where(
              outerVerb,
              camelCase(firstRelations),
              (builder) => {
                const reversePaths = paths.reverse();

                reversePaths.reduce((acc, path) => {
                  return function (qb) {
                    qb.whereHas(camelCase(path), acc, ">=", 1);
                  };
                }, leaf)(builder);
              },
              ">=",
              1
            );
          } else {
            where(
              outerVerb,
              firstRelations,
              (builder) => {
                leaf(builder);
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
          where("", column, operand, value);
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
