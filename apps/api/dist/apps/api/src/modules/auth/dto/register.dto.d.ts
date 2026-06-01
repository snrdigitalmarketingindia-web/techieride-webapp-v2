import { Gender, UserRole } from '@techieride/shared';
export declare class RegisterDto {
    email: string;
    password: string;
    fullName: string;
    gender?: Gender;
    companyName?: string;
    employeeId?: string;
    phone: string;
    personalEmail?: string;
    role: UserRole;
    homeLocation: string;
    officeLocation: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    bloodGroup?: string;
}
