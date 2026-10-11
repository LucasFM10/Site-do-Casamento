import "server-only";

import PocketBase from "pocketbase";

function getPocketBaseUrl() {
  return process.env.POCKETBASE_URL || "http://127.0.0.1:8090";
}

export function createPocketBase() {
  const pb = new PocketBase(getPocketBaseUrl());
  pb.autoCancellation(false);
  return pb;
}
