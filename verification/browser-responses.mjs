/** page.waitForResponse() armed before an action. If the action itself stalls (a button
 * that never appears), the wait times out while the harness is still awaiting the action,
 * and an unobserved rejection would kill the process before its finally blocks run: no
 * failure record, no trace, an orphaned API process and an undropped schema. Observing the
 * rejection here keeps it for the later await, so the action's own error is reported. */
export function expectResponse(page,predicate){const response=page.waitForResponse(predicate);response.catch(()=>{});return response;}
