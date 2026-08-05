<cfcomponent output="false" hint="The monolith side. Shares nothing with notifications.">

	<cfset this.datasource = "coredb">

	<cffunction name="place" access="public" returntype="numeric">
		<cfargument name="customerId" type="numeric" required="true">
		<cfquery name="local.insert" datasource="coredb">
			INSERT INTO orders ( customer_id ) VALUES (
				<cfqueryparam value="#arguments.customerId#" cfsqltype="cf_sql_integer">
			)
		</cfquery>
		<cfset session.lastOrderAt = now()>
		<cfreturn 1>
	</cffunction>

	<cffunction name="lines" access="public" returntype="query">
		<cfargument name="orderId" type="numeric" required="true">
		<cfquery name="local.rows" datasource="coredb">
			SELECT sku, qty FROM order_lines WHERE order_id = <cfqueryparam value="#arguments.orderId#" cfsqltype="cf_sql_integer">
		</cfquery>
		<cfreturn local.rows>
	</cffunction>

</cfcomponent>
