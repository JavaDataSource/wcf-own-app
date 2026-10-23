import { randomUUID } from "node:crypto";
import type { DatabaseManager } from "./database.js";
import {
    collectionDefinitions,
    type CollectionName,
    sourceCollectionByType,
} from "./collections.js";

export type Entity = Record<string, any>;

export class ValidationError extends Error {
    statusCode = 777;
}