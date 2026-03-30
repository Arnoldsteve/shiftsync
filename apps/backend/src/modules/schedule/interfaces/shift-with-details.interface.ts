import { Shift, Assignment, ShiftSkill, Skill } from '@prisma/client';

export interface ShiftWithDetails extends Shift {
  skills: Array<ShiftSkill & { skill: Skill }>;
  assignments: Assignment[];
}
