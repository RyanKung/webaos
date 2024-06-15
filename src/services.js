// copy from aos/services/connect.js

const VERSION = "1.11.0";
const AOS_MODULE = "nI_jcZgPd0rcsnjaHtaaJPpMCW847ou-3RGA5_W3aZg";

import { of, fromPromise, Rejected, Resolved } from "hyper-async";
import {
  message,
  createDataItemSigner,
  spawn,
  monitor,
  result,
} from "@permaweb/aoconnect";
import { gql } from "./gql.js";

export function readResult(params) {
  return fromPromise(
    () => new Promise((resolve) => setTimeout(() => resolve(params), 500)),
  )()
    .chain(fromPromise(() => result(params)))
    .bichain(
      fromPromise(
        () =>
          new Promise((resolve, reject) =>
            setTimeout(() => reject(params), 500),
          ),
      ),
      Resolved,
    );
}

export function sendMessage({ processId, wallet, tags, data }) {
  const signer = createDataItemSigner(wallet);

  const retry = () =>
    fromPromise(() => new Promise((r) => setTimeout(r, 500)))().chain(
      fromPromise(() => message({ process: processId, signer, tags, data })),
    );

  return (
    fromPromise(() => message({ process: processId, signer, tags, data }))()
      //.bimap(function (e) { console.log(e); return e }, function (a) { console.log(a); return a; })
      .bichain(retry, Resolved)
      .bichain(retry, Resolved)
      .bichain(retry, Resolved)
      .bichain(retry, Resolved)
      .bichain(retry, Resolved)
      .bichain(retry, Resolved)
      .bichain(retry, Resolved)
      .bichain(retry, Resolved)
      .bichain(retry, Resolved)
      .bichain(retry, Resolved)
      .bichain(retry, Resolved)
      .bichain(retry, Resolved)
      .bichain(retry, Resolved)
      .bichain(retry, Resolved)
      .bichain(retry, Resolved)
      .bichain(retry, Resolved)
      .bichain(retry, Resolved)
      .bichain(retry, Resolved)
      .bichain(retry, Resolved)
      .bichain(retry, Resolved)
      .bichain(retry, Resolved)
  );
  //.map(result => (console.log(result), result))
}

export function spawnProcess({ wallet, src, tags, data }) {
  const SCHEDULER = "_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA";
  const signer = createDataItemSigner(wallet);

  tags = tags.concat([{ name: "aos-Version", value: VERSION }]);
  return fromPromise(() =>
    spawn({
      module: src,
      scheduler: SCHEDULER,
      signer,
      tags,
      data,
    }).then(
      (result) =>
        new Promise((resolve) => setTimeout(() => resolve(result), 500)),
    ),
  )();
}

export function monitorProcess({ id, wallet }) {
  const signer = createDataItemSigner(wallet);
  return fromPromise(() => monitor({ process: id, signer }))();
  //.map(result => (console.log(result), result))
}

function queryForAOS(name, AOS_MODULE) {
  return `query ($owners: [String!]!) {
    transactions(
      first: 1,
      owners: $owners,
      tags: [
        { name: "Data-Protocol", values: ["ao"] },
        { name: "Type", values: ["Process"]},
        { name: "Name", values: ["${name}"]}
      ]
    ) {
      edges {
        node {
          id
        }
      }
    }
  }`;
}

export const path = (props) => (obj) =>
  props.reduce(
    (acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined),
    obj,
  );
export const identity = (x) => x;

/// from aos/src/register
export function register(wallet, address) {
  const findProcess = ({ wallet, address, name, spawnTags }) => {
    return gql(queryForAOS(name, AOS_MODULE), { owners: [address, ""] })
      .map(path(["data", "transactions", "edges"]))
      .bichain(
        (_) => Rejected({ ok: false }),
        (results) => {
          console.log("find process result", results);
          console.log("name", name);
          return results.length > 0
            ? Resolved(results.reverse())
            : Rejected({ ok: true, wallet: wallet, address, name, spawnTags });
        },
      );
  };

  const createProcess = ({ ok, wallet, address, name, spawnTags }) => {
    let data = "1984";
    let tags = [
      { name: "App-Name", value: "aos" },
      { name: "Name", value: name },
      {
        name: "Authority",
        value: "fcoN_xJeisVsPXA-trzVAuIiqO3ydLQxM-L4XbrQKzY",
      },
      ...(spawnTags || []),
    ];
    return spawnProcess({
      wallet: wallet,
      src: AOS_MODULE,
      tags,
      data,
    });
  };

  const alreadyRegistered = (results) => Resolved(results[0].node.id);
  const name = "default";

  const spawnTags = [
    {
      name: String(""),
      value: String(""),
    },
  ];

  return of({ wallet, address, name, spawnTags })
    .chain(findProcess)
    .bichain(createProcess, alreadyRegistered);
}

/// from aos/src/evaluate.js
export async function evaluate(line, processId, wallet) {
  return of()
    .chain(() =>
      sendMessage({
        processId: processId,
        wallet: wallet,
        tags: [{ name: "Action", value: "Eval" }],
        data: line,
      }),
    )
    .map((message) => ({ message, process: processId }))
    .chain(readResult)
    .bichain(readResult, Resolved)
    .bichain(readResult, Resolved)
    .bichain(readResult, Resolved)
    .bichain(readResult, Resolved)
    .bichain(readResult, Resolved)
    .bichain(readResult, Resolved)
    .bichain(readResult, Resolved)
    .bichain(readResult, Resolved)
    .bichain(readResult, Resolved)
    .bichain(readResult, Resolved)
    .bichain(readResult, Resolved)
    .bichain(readResult, Resolved)
    .bichain(readResult, Resolved)
    .bichain(readResult, Resolved)
    .bichain(readResult, Resolved)
    .bichain(readResult, Resolved)
    .bichain(readResult, Resolved)
    .bichain(readResult, Resolved)
    .toPromise();
}
