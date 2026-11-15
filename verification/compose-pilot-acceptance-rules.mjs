// Pure rules for verification/compose-pilot-acceptance.mjs, kept apart so they are unit tested
// (test/compose-pilot-acceptance.test.mjs) without a running deployment or a browser.

/** The dedicated acceptance learner. Its display name says what it is to anyone reading
 * People & roles or an enrollment list on the target. */
export const ACCEPTANCE_LEARNER={loginName:'acceptance-learner',displayName:'Acceptance learner (automated pilot check)'};

const VALUE_FLAGS=['--origin','--package','--operator-login','--operator-password-file','--workspace','--out','--expect-core','--learner-login','--timeout-seconds'];
const SWITCHES=['--allow-provider-calls','--read-only','--help'];
export const USAGE=`Usage: node verification/compose-pilot-acceptance.mjs --origin <url> --package <course dir or course-v<version>.tgz>
  --operator-login <owner or admin login> [--operator-password-file <owner-only file>]
  [--workspace <slug>] [--out <dir>] [--expect-core <version>] [--learner-login <name>]
  [--read-only] [--allow-provider-calls] [--timeout-seconds <n>]
The operator password comes from --operator-password-file (a file only its owner can read), else
COURSE_OPERATOR_PASSWORD, else a no-echo prompt on a terminal. It is never printed or written.`;

/** Parses the command line. Unknown flags and flags missing their value are refused, so a
 * mistyped option never silently changes what runs against a live deployment. */
export function parseArguments(argv){
  const options={allowProviderCalls:false,readOnly:false,help:false,workspace:'llms-and-models',learnerLogin:ACCEPTANCE_LEARNER.loginName,timeoutSeconds:60};
  for(let i=0;i<argv.length;i++){
    const flag=argv[i];
    if(SWITCHES.includes(flag)){options[{'--allow-provider-calls':'allowProviderCalls','--read-only':'readOnly','--help':'help'}[flag]]=true;continue;}
    if(!VALUE_FLAGS.includes(flag))throw new Error(`Unknown argument ${JSON.stringify(flag.slice(0,60))}\n${USAGE}`);
    const value=argv[++i];if(value===undefined||value.startsWith('--'))throw new Error(`${flag} needs a value\n${USAGE}`);
    const key=flag.slice(2).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());options[key]=key==='timeoutSeconds'?Number(value):value;
  }
  if(options.help)return options;
  for(const [key,flag] of [['origin','--origin'],['package','--package'],['operatorLogin','--operator-login']])if(!options[key])throw new Error(`${flag} is required\n${USAGE}`);
  const url=new URL(options.origin);
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('--origin must be a bare http(s) origin such as http://localhost:4310');
  options.origin=url.origin;
  if(!/^[a-z][a-z0-9-]{0,99}$/.test(options.workspace))throw new Error('--workspace must be a workspace slug');
  if(!/^[a-z0-9][a-z0-9._@+:-]{1,126}[a-z0-9]$/.test(options.learnerLogin))throw new Error('--learner-login must be a valid Core login name');
  if(!Number.isInteger(options.timeoutSeconds)||options.timeoutSeconds<5||options.timeoutSeconds>1800)throw new Error('--timeout-seconds must be 5-1800');
  if(options.readOnly&&options.allowProviderCalls)throw new Error('--read-only and --allow-provider-calls contradict each other');
  return options;
}

/** True when the workspace can reach a live model provider: any provider connection, or any
 * provider role (supervisor, companion, research, media, reviewer) whose configuration is not
 * absent. Unknown shapes count as live, so a changed API never turns the guard off. */
export function liveProvidersConfigured({connections,providers}){
  if(!Array.isArray(connections)||!Array.isArray(providers))return true;
  return connections.length>0||providers.some(p=>p?.configuration!=='absent'||!['configuration_missing','not_configured','absent'].includes(p?.runtimeStatus));
}

/** How far the learner walk may go. 'full' enrolls the acceptance learner (once), completes the
 * first lesson's independent checks and resumes on the other sizes; 'read-only' only signs in
 * and reads. Learning writes raise supervised events, which a live provider may answer at the
 * owner's cost, so with live providers the walk is read-only unless --allow-provider-calls. */
export function walkMode({live,allowProviderCalls,readOnly}){
  if(readOnly)return {mode:'read-only',reason:'requested'};
  if(!live)return {mode:'full',reason:'no_live_provider_configured'};
  if(allowProviderCalls)return {mode:'full',reason:'provider_calls_allowed_by_flag'};
  return {mode:'read-only',reason:'live_provider_configured'};
}

/** The writes the browser may send. Everything else that is not a GET/HEAD/OPTIONS is aborted
 * and recorded: companion messages, research, media and review assistance (direct provider
 * calls) are never sent by this harness, in either mode. The full walk also lets the learner
 * app report its device (platform-capabilities) and open activity presence, as any learner does;
 * the read-only walk sends nothing but sign-in and sign-out. */
export function allowedWrite(method,pathname,mode){
  if(['GET','HEAD','OPTIONS'].includes(method))return true;
  if(method!=='POST')return false;
  if(pathname==='/auth/login'||pathname==='/auth/logout')return true;
  if(mode!=='full')return false;
  if(pathname==='/api/enrollments')return true;
  return /^\/api\/enrollments\/[0-9a-f-]{36}\/(read|challenges|answers|complete|presence|platform-capabilities)$/.test(pathname);
}

/** The installed course must be the released package: the workspace's selected (published)
 * release for this course key has the package's version and digest, and administration shows
 * that release published and selected for new learners. */
export function checkInstalledRelease({selected,adminReleases,manifest}){
  const problems=[];
  const mine=(selected??[]).filter(r=>r.course_key===manifest.courseId);
  if(mine.length!==1)problems.push(`expected one selected release of ${manifest.courseId}, found ${mine.length}`);
  const release=mine[0];
  if(release){
    if(release.version!==manifest.courseVersion)problems.push(`selected version ${release.version} is not the package's ${manifest.courseVersion}`);
    if(release.digest!==manifest.courseDigest)problems.push('selected release digest differs from the package digest');
    if(release.status!=='published')problems.push(`selected release is ${release.status}`);
    const admin=(adminReleases??[]).find(r=>r.id===release.id);
    if(!admin)problems.push('selected release is missing from the administration course view');
    else if(admin.state!=='published'||admin.availableForNewLearners!==true)problems.push('administration does not show the release published and selected for new learners');
  }
  return {ok:problems.length===0,problems,releaseId:release?.id??null,version:release?.version??null,digest:release?.digest??null};
}

/** Platform readiness as the owner sees it: the expected Core version, current migrations and
 * a working database, supervisor (Temporal) and code sandbox. Backups and telemetry are
 * recorded, not required (a fresh disposable stack has none). */
export function checkReadiness(readiness,expectCore){
  const checks=Object.fromEntries((readiness?.checks??[]).map(c=>[c.id,c]));const problems=[];
  if(checks.version?.facts?.coreVersion!==expectCore)problems.push(`Core version ${checks.version?.facts?.coreVersion??'unknown'} is not ${expectCore}`);
  if(checks.database?.status!=='ok'||checks.database?.facts?.migrationsCurrent!==true)problems.push('database check is not ok or migrations are not current');
  for(const id of ['temporal','sandbox'])if(checks[id]?.status!=='ok')problems.push(`${id} check is ${checks[id]?.status??'missing'}`);
  return {ok:problems.length===0,problems,coreVersion:checks.version?.facts?.coreVersion??null,migrations:checks.database?.facts?.migrationsApplied??null,
    latestMigration:checks.database?.facts?.latestMigration??null,backups:checks.backups?.status??null,overall:readiness?.overall??null};
}

/** What to do about the acceptance learner, from the People list. It is reused when present,
 * never created twice, and never taken over when the login belongs to someone else. */
export function learnerAction(people,loginName){
  const found=(people??[]).filter(p=>p.loginName===loginName);
  if(found.length===0)return {action:'invite'};
  const person=found[0];
  if(person.role!=='learner')return {action:'refuse',reason:`login ${loginName} belongs to a ${person.role}, not a learner`};
  if(!person.canSetPassword)return {action:'refuse',reason:`login ${loginName} is not an invited account whose password administration may reset`};
  if(person.self)return {action:'refuse',reason:'the acceptance learner cannot be the operator'};
  return {action:'reset',userId:person.userId};
}

/** Removes anything that looks like a credential from a value before it is printed or saved. */
export function redact(value){
  const secretKey=/password|token|csrf|cookie|secret|code$/i;
  if(Array.isArray(value))return value.map(redact);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,secretKey.test(k)?'[redacted]':redact(v)]));
  return value;
}
