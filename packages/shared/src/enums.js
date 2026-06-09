"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrustBand = exports.WsEvents = exports.BoardingStatus = exports.NotificationType = exports.RequestStatus = exports.RideStatus = exports.EcoLevel = exports.VerificationStatus = exports.UserRole = exports.Gender = exports.VerificationType = exports.AccountStatus = void 0;
var AccountStatus;
(function (AccountStatus) {
    AccountStatus["DRAFT"] = "DRAFT";
    AccountStatus["EMAIL_VERIFICATION_PENDING"] = "EMAIL_VERIFICATION_PENDING";
    AccountStatus["PERSONAL_EMAIL_PENDING"] = "PERSONAL_EMAIL_PENDING";
    AccountStatus["DOCUMENT_VERIFICATION_PENDING"] = "DOCUMENT_VERIFICATION_PENDING";
    AccountStatus["SEEKER_VERIFIED"] = "SEEKER_VERIFIED";
    AccountStatus["DRIVER_VERIFICATION_PENDING"] = "DRIVER_VERIFICATION_PENDING";
    AccountStatus["DRIVER_VERIFIED"] = "DRIVER_VERIFIED";
    AccountStatus["SUSPENDED"] = "SUSPENDED";
    AccountStatus["REJECTED"] = "REJECTED";
    AccountStatus["DEACTIVATED"] = "DEACTIVATED";
    AccountStatus["BANNED"] = "BANNED";
})(AccountStatus || (exports.AccountStatus = AccountStatus = {}));
var VerificationType;
(function (VerificationType) {
    VerificationType["IDENTITY"] = "IDENTITY";
    VerificationType["DRIVER"] = "DRIVER";
})(VerificationType || (exports.VerificationType = VerificationType = {}));
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
    NotificationType["SEEKER_NO_SHOW"] = "SEEKER_NO_SHOW";
    NotificationType["SOS_ALERT"] = "SOS_ALERT";
    NotificationType["RATING_RECEIVED"] = "RATING_RECEIVED";
    NotificationType["COMPLAINT_FILED"] = "COMPLAINT_FILED";
    NotificationType["GENERIC"] = "GENERIC";
    NotificationType["QUICK_MESSAGE"] = "QUICK_MESSAGE";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var ComplaintReason;
(function (ComplaintReason) {
    ComplaintReason["HARASSMENT"] = "HARASSMENT";
    ComplaintReason["NO_SHOW"] = "NO_SHOW";
    ComplaintReason["UNSAFE_DRIVING"] = "UNSAFE_DRIVING";
    ComplaintReason["FRAUD"] = "FRAUD";
    ComplaintReason["INAPPROPRIATE_CONTENT"] = "INAPPROPRIATE_CONTENT";
    ComplaintReason["OTHER"] = "OTHER";
})(ComplaintReason || (exports.ComplaintReason = ComplaintReason = {}));
var ComplaintStatus;
(function (ComplaintStatus) {
    ComplaintStatus["OPEN"] = "OPEN";
    ComplaintStatus["UNDER_REVIEW"] = "UNDER_REVIEW";
    ComplaintStatus["RESOLVED"] = "RESOLVED";
    ComplaintStatus["DISMISSED"] = "DISMISSED";
})(ComplaintStatus || (exports.ComplaintStatus = ComplaintStatus = {}));
var BoardingStatus;
(function (BoardingStatus) {
    BoardingStatus["WAITING"] = "WAITING";
    BoardingStatus["BOARDED"] = "BOARDED";
    BoardingStatus["DEBOARDED"] = "DEBOARDED";
    BoardingStatus["NO_SHOW"] = "NO_SHOW";
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
var TrustBand;
(function (TrustBand) {
    TrustBand["NEW"] = "NEW";
    TrustBand["BRONZE"] = "BRONZE";
    TrustBand["SILVER"] = "SILVER";
    TrustBand["GOLD"] = "GOLD";
    TrustBand["PLATINUM"] = "PLATINUM";
})(TrustBand || (exports.TrustBand = TrustBand = {}));
//# sourceMappingURL=enums.js.map