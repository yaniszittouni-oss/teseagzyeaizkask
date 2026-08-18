"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
/** Client Prisma partagé (singleton) pour tout le process. */
exports.prisma = new client_1.PrismaClient();
//# sourceMappingURL=prisma.js.map