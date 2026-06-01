"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsEvents = exports.BoardingStatus = exports.NotificationType = exports.RequestStatus = exports.RideStatus = exports.EcoLevel = exports.VerificationStatus = exports.UserRole = exports.Gender = void 0;
var Gender;
(function (Gender) {
    Gender["MALE"] = "MALE";
    Gender["FEMALE"] = "FEMALE";
    Gender["OTHER"] = "OTHER";
})(Gender || (exports.Gender = Gender = {}));
var UserRole;
(function (UserRole) {
    UserRole["RIDE_GIVER"] = "RIDE_GIVER";
    UserRole["RIDE_SEEKER"] = "RIDE_SEEKER";
    UserRole["BOTH"] = "BOTH";
    UserRole["ADMIN"] = "ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
var VerificationStatus;
(function (VerificationStatus) {
    VerificationStatus["PENDING"] = "PENDING";
    VerificationStatus["APPROVED"] = "APPROVED";
    VerificationStatus["REJECTED"] = "REJECTED";
})(VerificationStatus || (exports.VerificationStatus = VerificationStatus = {}));
var EcoLevel;
(function (EcoLevel) {
    EcoLevel["SEED"] = "SEED";
    EcoLevel["SPROUT"] = "SPROUT";
    EcoLevel["LEAF"] = "LEAF";
    EcoLevel["TREE"] = "TREE";
    EcoLevel["FOREST"] = "FOREST";
})(EcoLevel || (exports.EcoLevel = EcoLevel = {}));
var RideStatus;
(function (RideStatus) {
    RideStatus["DRAFT"] = "DRAFT";
    RideStatus["PUBLISHED"] = "PUBLISHED";
    RideStatus["ONGOING"] = "ONGOING";
    RideStatus["COMPLETED"] = "COMPLETED";
    RideStatus["CANCELLED"] = "CANCELLED";
})(RideStatus || (exports.RideStatus = RideStatus = {}));
var RequestStatus;
(function (RequestStatus) {
    RequestStatus["PENDING"] = "PENDING";
    RequestStatus["APPROVED"] = "APPROVED";
    RequestStatus["HOLD"] = "HOLD";
    RequestStatus["CONFIRMED"] = "CONFIRMED";
    RequestStatus["REJECTED"] = "REJECTED";
    RequestStatus["CANCELLED"] = "CANCELLED";
    RequestStatus["NO_SHOW"] = "NO_SHOW";
})(RequestStatus || (exports.RequestStatus = RequestStatus = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["RIDE_APPROVED"] = "RIDE_APPROVED";
    NotificationType["RIDE_REJECTED"] = "RIDE_REJECTED";
    NotificationType["RIDE_CONFIRMED"] = "RIDE_CONFIRMED";
    NotificationType["RIDE_STARTED"] = "RIDE_STARTED";
    NotificationType["RIDE_COMPLETED"] = "RIDE_COMPLETED";
    NotificationType["RIDE_CANCELLED"] = "RIDE_CANCELLED";
    NotificationType["REQUEST_APPROVED"] = "REQUEST_APPROVED";
    NotificationType["REQUEST_REJECTED"] = "REQUEST_REJECTED";
    NotificationType["HOLD_EXPIRING"] = "HOLD_EXPIRING";
    NotificationType["HOLD_EXPIRED"] = "HOLD_EXPIRED";
    NotificationType["VERIFICATION_APPROVED"] = "VERIFICATION_APPROVED";
    NotificationType["VERIFICATION_REJECTED"] = "VERIFICATION_REJECTED";
    NotificationType["SEEKER_BOARDED"] = "SEEKER_BOARDED";
    NotificationType["SEEKER_DEBOARDED"] = "SEEKER_DEBOARDED";
    NotificationType["SOS_ALERT"] = "SOS_ALERT";
    NotificationType["GENERIC"] = "GENERIC";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var BoardingStatus;
(function (BoardingStatus) {
    BoardingStatus["WAITING"] = "WAITING";
    BoardingStatus["BOARDED"] = "BOARDED";
    BoardingStatus["DEBOARDED"] = "DEBOARDED";
})(BoardingStatus || (exports.BoardingStatus = BoardingStatus = {}));
var WsEvents;
(function (WsEvents) {
    WsEvents["GPS_UPDATE"] = "gps:update";
    WsEvents["RIDE_STATUS"] = "ride:status";
    WsEvents["NOTIFICATION_NEW"] = "notification:new";
    WsEvents["SOS_ALERT"] = "sos:alert";
    WsEvents["JOIN_RIDE"] = "ride:join";
    WsEvents["LEAVE_RIDE"] = "ride:leave";
})(WsEvents || (exports.WsEvents = WsEvents = {}));
//# sourceMappingURL=enums.js.map