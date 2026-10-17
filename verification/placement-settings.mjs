// Core 0.1.40+ (migration 048): placement runs only when the course offers it AND staff
// switched it on for the course; with no settings row it is off. The released-surface
// flows were written for placement being offered, so they first check the default is
// off, then switch it on through the admin settings route, as an owner would. Core's
// default retest cooldown and run limit are kept; only the switch changes.
export async function enablePlacement({request,requireOk,check,staff,catalogId}){
  const route=`/api/admin/courses/${catalogId}/placement`,before=requireOk(await request(staff,'GET',route),'placement_settings_view');
  check(before.settings.enabled===false&&before.settings.revision===0&&before.effective?.authorEnabled===true&&before.effective.enabled===false,'placement_not_off_by_default');
  const {retestCooldownHours,maxRuns,maxItems,minFamiliesPerEpisode}=before.settings;
  requireOk(await request(staff,'POST',route+'/settings',{expectedRevision:before.settings.revision,enabled:true,retestCooldownHours,maxRuns,maxItems,minFamiliesPerEpisode}),'placement_settings_save');
  const after=requireOk(await request(staff,'GET',route),'placement_settings_view');
  check(after.settings.enabled===true&&after.effective.enabled===true&&after.effective.maxItems===before.effective.authorMaxItems,'placement_not_enabled');
  return {offByDefault:true,enabledByStaff:true,maxItems:after.effective.maxItems,retestCooldownHours,maxRuns};
}
