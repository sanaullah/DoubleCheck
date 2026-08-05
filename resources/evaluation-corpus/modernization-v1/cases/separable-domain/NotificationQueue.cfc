<cfcomponent output="false" hint="Only collaborator is NotificationService. No shared tables, no shared scope.">

	<cfset this.datasource = "notifydb">

	<cffunction name="drain" access="public" returntype="numeric">
		<cfset var sender = createObject( "component", "NotificationService" )>
		<cfquery name="local.pending" datasource="notifydb">
			SELECT recipient, body FROM notification_queue WHERE sent = 0
		</cfquery>
		<cfloop query="local.pending">
			<cfset sender.send( local.pending.recipient, local.pending.body )>
		</cfloop>
		<cfreturn local.pending.recordCount>
	</cffunction>

</cfcomponent>
