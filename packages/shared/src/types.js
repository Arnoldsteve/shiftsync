"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityType = exports.AuditAction = exports.SwapStatus = exports.Role = void 0;
var Role;
(function (Role) {
    Role["ADMIN"] = "ADMIN";
    Role["MANAGER"] = "MANAGER";
    Role["STAFF"] = "STAFF";
})(Role || (exports.Role = Role = {}));
var SwapStatus;
(function (SwapStatus) {
    SwapStatus["PENDING"] = "PENDING";
    SwapStatus["APPROVED"] = "APPROVED";
    SwapStatus["REJECTED"] = "REJECTED";
})(SwapStatus || (exports.SwapStatus = SwapStatus = {}));
var AuditAction;
(function (AuditAction) {
    AuditAction["CREATE"] = "CREATE";
    AuditAction["UPDATE"] = "UPDATE";
    AuditAction["DELETE"] = "DELETE";
    AuditAction["APPROVE"] = "APPROVE";
    AuditAction["REJECT"] = "REJECT";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
var EntityType;
(function (EntityType) {
    EntityType["SHIFT"] = "SHIFT";
    EntityType["ASSIGNMENT"] = "ASSIGNMENT";
    EntityType["SWAP_REQUEST"] = "SWAP_REQUEST";
    EntityType["USER"] = "USER";
    EntityType["CALLOUT"] = "CALLOUT";
    EntityType["CONFIG"] = "CONFIG";
})(EntityType || (exports.EntityType = EntityType = {}));
//# sourceMappingURL=types.js.map