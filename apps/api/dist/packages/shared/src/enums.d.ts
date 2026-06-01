export declare enum Gender {
    MALE = "MALE",
    FEMALE = "FEMALE",
    OTHER = "OTHER"
}
export declare enum UserRole {
    RIDE_GIVER = "RIDE_GIVER",
    RIDE_SEEKER = "RIDE_SEEKER",
    BOTH = "BOTH",
    ADMIN = "ADMIN"
}
export declare enum VerificationStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED"
}
export declare enum EcoLevel {
    SEED = "SEED",
    SPROUT = "SPROUT",
    LEAF = "LEAF",
    TREE = "TREE",
    FOREST = "FOREST"
}
export declare enum RideStatus {
    DRAFT = "DRAFT",
    PUBLISHED = "PUBLISHED",
    ONGOING = "ONGOING",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export declare enum RequestStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    HOLD = "HOLD",
    CONFIRMED = "CONFIRMED",
    REJECTED = "REJECTED",
    CANCELLED = "CANCELLED",
    NO_SHOW = "NO_SHOW"
}
export declare enum NotificationType {
    RIDE_APPROVED = "RIDE_APPROVED",
    RIDE_REJECTED = "RIDE_REJECTED",
    RIDE_CONFIRMED = "RIDE_CONFIRMED",
    RIDE_STARTED = "RIDE_STARTED",
    RIDE_COMPLETED = "RIDE_COMPLETED",
    RIDE_CANCELLED = "RIDE_CANCELLED",
    REQUEST_APPROVED = "REQUEST_APPROVED",
    REQUEST_REJECTED = "REQUEST_REJECTED",
    HOLD_EXPIRING = "HOLD_EXPIRING",
    HOLD_EXPIRED = "HOLD_EXPIRED",
    VERIFICATION_APPROVED = "VERIFICATION_APPROVED",
    VERIFICATION_REJECTED = "VERIFICATION_REJECTED",
    SEEKER_BOARDED = "SEEKER_BOARDED",
    SEEKER_DEBOARDED = "SEEKER_DEBOARDED",
    SEEKER_NO_SHOW = "SEEKER_NO_SHOW",
    SOS_ALERT = "SOS_ALERT",
    GENERIC = "GENERIC"
}
export declare enum BoardingStatus {
    WAITING = "WAITING",
    BOARDED = "BOARDED",
    DEBOARDED = "DEBOARDED",
    NO_SHOW = "NO_SHOW"
}
export declare enum WsEvents {
    GPS_UPDATE = "gps:update",
    RIDE_STATUS = "ride:status",
    NOTIFICATION_NEW = "notification:new",
    SOS_ALERT = "sos:alert",
    JOIN_RIDE = "ride:join",
    LEAVE_RIDE = "ride:leave"
}
