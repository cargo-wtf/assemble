import { assemble, get } from "jsr:@cargo/assemble";

// Register simple value and make it available in Cargo Assemble

assemble({
  token: "hello",
  value: "world",
});

// Get value from Cargo Assemble via token
get("hello");
