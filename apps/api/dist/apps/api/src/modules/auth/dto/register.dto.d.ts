import { Gender, UserRole } from '@techieride/shared';
export declare class RegisterDto {
    phone: string;
    email: string;
    fullName: string;
    gender?: Gender;
    companyName?: string;
    employeeId?: string;
    role: UserRole;
}
