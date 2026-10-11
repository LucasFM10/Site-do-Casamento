/// <reference path="../pb_data/types.d.ts" />

onRecordCreateRequest((event) => {
  // The read status belongs to the couple, never to the public submitter.
  event.record.set("vista", false);
  event.next();
}, "tercos");
