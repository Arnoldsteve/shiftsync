import { MongoAbility } from '@casl/ability';
import { Action } from './action.enum';
import { Subjects } from './subjects.type';

export type AppAbility = MongoAbility<[Action, Subjects]>;
