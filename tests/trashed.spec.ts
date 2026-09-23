import test from "japa";

// Les modules `@ioc:` n'existent qu'au sein d'une application Adonis :
// on les remplace par un bouchon pour tester hors application.
const Module = require("module");
const originalLoad = Module._load;
Module._load = function (request: string, ...rest: any[]) {
  if (request.startsWith("@ioc:")) return { default: { raw: (s) => s } };
  return originalLoad.call(this, request, ...rest);
};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ControllerHelper = require("../src/helpers/ControllerHelper");

// Faux query builder : trace les appels de corbeille sans base de données.
function fakeQuery(softDelete: boolean) {
  const calls: string[] = [];
  const query: any = {
    calls,
    model: softDelete ? { ignoreDeleted() {} } : {},
    withTrashed() {
      calls.push("withTrashed");
      return query;
    },
    onlyTrashed() {
      calls.push("onlyTrashed");
      return query;
    },
  };
  return query;
}

test.group("ControllerHelper.trashed", () => {
  test("défaut et valeurs inconnues : aucun appel", (assert) => {
    for (const payload of [
      {},
      { trashed: "without" },
      { trashed: "nimporte" },
    ]) {
      const q = fakeQuery(true);
      ControllerHelper.trashed(q, payload);
      assert.deepEqual(q.calls, []);
    }
  });

  test("with -> withTrashed", (assert) => {
    const q = fakeQuery(true);
    ControllerHelper.trashed(q, { trashed: "with" });
    assert.deepEqual(q.calls, ["withTrashed"]);
  });

  test("only -> onlyTrashed", (assert) => {
    const q = fakeQuery(true);
    ControllerHelper.trashed(q, { trashed: "only" });
    assert.deepEqual(q.calls, ["onlyTrashed"]);
  });

  test("modèle sans soft delete : ignoré, sans erreur", (assert) => {
    const q = fakeQuery(false);
    ControllerHelper.trashed(q, { trashed: "only" });
    assert.deepEqual(q.calls, []);
  });

  test("searchPayload applique la corbeille avant l'exécution", async (assert) => {
    const q: any = fakeQuery(true);
    q.then = (resolve) => resolve([]);
    q.where = () => q;
    q.orderBy = () => q;
    await ControllerHelper.searchPayload(q, { trashed: "only" });
    assert.deepEqual(q.calls, ["onlyTrashed"]);
  });
});
