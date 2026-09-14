<cfcomponent output="false" hint="Domain B. Zero overlap with catalog: different tables, different collaborator.">

	<cfset this.datasource = "logisticsdb">

	<cffunction name="quote" access="public" returntype="numeric">
		<cfargument name="postcode" type="string" required="true">
		<cfset var carriers = createObject( "component", "CarrierGateway" )>
		<cfquery name="local.rows" datasource="logisticsdb">
			SELECT zone FROM shipping_zones WHERE postcode = <cfqueryparam value="#arguments.postcode#" cfsqltype="cf_sql_varchar">
		</cfquery>
		<cfreturn carriers.rateFor( local.rows.zone )>
	</cffunction>

</cfcomponent>
