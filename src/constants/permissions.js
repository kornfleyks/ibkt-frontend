import { ROLES } from './roles';

const roleOf = user => user?.role || user?.Role || user?.ROLE;

export const isAdmin = user => roleOf(user) === ROLES.ADMIN;
export const isVolunteer = user => roleOf(user) === ROLES.VOLUNTEER;
export const isRescuer = user => roleOf(user) === ROLES.RESCUER;
export const isFoster = user => roleOf(user) === ROLES.FOSTER;
export const isAdopter = user => roleOf(user) === ROLES.ADOPTER;

export const canManageUsers = user => isAdmin(user);
export const canManageSystemData = user => isAdmin(user);
export const canManageCats = user => isAdmin(user) || isVolunteer(user) || isRescuer(user) || isFoster(user);
export const canManageActiveApplications = user => isAdmin(user) || isVolunteer(user);
export const canManageTasks = user => isAdmin(user) || isVolunteer(user);
export const canViewOwnCats = user => isRescuer(user) || isFoster(user);
export const canViewOwnActiveApplications = user => isAdopter(user);
export const canViewTravel = user => isAdmin(user) || isVolunteer(user);
export const canViewPostAdoption = user => isAdmin(user) || isVolunteer(user) || isAdopter(user);
