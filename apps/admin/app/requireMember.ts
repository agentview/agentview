import { data } from "react-router";
import { requireOrganization } from "./requireOrganization";

export async function requireMember(organization: Awaited<ReturnType<typeof requireOrganization>>, memberId: string) {
    const member = organization.members.find(m => m.id === memberId);
    if (!member) {
        throw data({ message: "Member not found" });
    }
    return member;
}

export async function requireMemberByUserId(organization: Awaited<ReturnType<typeof requireOrganization>>, userId: string) {
    const member = organization.members.find(m => m.userId === userId);
    if (!member) {
        throw data({ message: "Member not found" });
    }
    return member;
}