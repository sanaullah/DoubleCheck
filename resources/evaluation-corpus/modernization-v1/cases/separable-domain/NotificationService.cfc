<cfcomponent output="false" hint="Owns its own table and talks only to an external provider.">

	<cfset this.datasource = "notifydb">

	<cffunction name="send" access="public" returntype="boolean">
		<cfargument name="recipient" type="string" required="true">
		<cfargument name="body" type="string" required="true">
		<cfhttp url="https://provider.example.com/v1/send" method="post" result="local.response">
			<cfhttpparam type="formfield" name="to" value="#arguments.recipient#">
			<cfhttpparam type="formfield" name="body" value="#arguments.body#">
		</cfhttp>
		<cfquery name="local.log" datasource="notifydb">
			INSERT INTO notification_log ( recipient, status )
			VALUES (
				<cfqueryparam value="#arguments.recipient#" cfsqltype="cf_sql_varchar">,
				<cfqueryparam value="#local.response.statusCode#" cfsqltype="cf_sql_varchar">
			)
		</cfquery>
		<cfreturn true>
	</cffunction>

	<cffunction name="history" access="public" returntype="query">
		<cfquery name="local.rows" datasource="notifydb">
			SELECT recipient, status FROM notification_log ORDER BY id DESC
		</cfquery>
		<cfreturn local.rows>
	</cffunction>

</cfcomponent>
