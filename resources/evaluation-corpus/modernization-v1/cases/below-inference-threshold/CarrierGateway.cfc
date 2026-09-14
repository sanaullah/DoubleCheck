<cfcomponent output="false" hint="Domain B collaborator. External carrier only.">

	<cfset this.datasource = "logisticsdb">

	<cffunction name="rateFor" access="public" returntype="numeric">
		<cfargument name="zone" type="string" required="true">
		<cfhttp url="https://carrier.example.com/rate" method="get" result="local.response">
			<cfhttpparam type="url" name="zone" value="#arguments.zone#">
		</cfhttp>
		<cfquery name="local.cache" datasource="logisticsdb">
			INSERT INTO carrier_rates ( zone ) VALUES (
				<cfqueryparam value="#arguments.zone#" cfsqltype="cf_sql_varchar">
			)
		</cfquery>
		<cfreturn 1>
	</cffunction>

</cfcomponent>
