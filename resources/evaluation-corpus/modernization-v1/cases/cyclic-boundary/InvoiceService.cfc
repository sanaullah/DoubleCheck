<cfcomponent output="false" hint="The other half: constructs OrderService, closing the cycle.">

	<cfset this.datasource = "coredb">

	<cffunction name="raiseFor" access="public" returntype="numeric">
		<cfargument name="orderId" type="numeric" required="true">
		<!--- Calls back into orders: neither side can be extracted alone. --->
		<cfset var orders = createObject( "component", "OrderService" )>
		<cfset var total = orders.totalFor( arguments.orderId )>
		<cfquery name="local.insert" datasource="coredb">
			INSERT INTO invoices ( order_id, total ) VALUES (
				<cfqueryparam value="#arguments.orderId#" cfsqltype="cf_sql_integer">,
				<cfqueryparam value="#total#" cfsqltype="cf_sql_decimal">
			)
		</cfquery>
		<cfreturn 1>
	</cffunction>

	<cffunction name="exportLedger" access="public" returntype="void">
		<cfset var writer = createObject( "java", "java.io.FileWriter" ).init( expandPath( "./ledger.csv" ) )>
		<cfset writer.close()>
	</cffunction>

</cfcomponent>
