import common from './common';
import nav from './nav';
import auth from './auth';
import dashboard from './dashboard';
import profile from './profile';
import password from './password';
import progress from './progress';
import parent from './parent';
import users from './users';
import roles from './roles';
import schools from './schools';
import nodeTypes from './nodeTypes';
import catalog from './catalog';
import exams from './exams';
import questions from './questions';
import bookImport from './bookImport';
import content from './content';
import auditLogs from './auditLogs';
import library from './library';
import schoolDashboard from './schoolDashboard';
import schoolStudents from './schoolStudents';

const all: Record<string, string> = {};
for (const mod of [common, nav, auth, dashboard, profile, password, progress, parent, users, roles, schools, nodeTypes, catalog, exams, questions, bookImport, content, auditLogs, library, schoolDashboard, schoolStudents]) {
    Object.assign(all, mod);
}

export default all;
