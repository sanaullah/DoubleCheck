<cfcomponent output="false" hint="Half of a cycle: constructs InvoiceService, which constructs it back.">

	<cfset this.datasource = "coredb">

	<cffunction name="finalize" access="public" returntype="void">
		<cfargument name="orderId" type="numeric" required="true">
		<cfset var invoicing = createObject( "component", "InvoiceService" )>
		<cfset invoicing.raiseFor( arguments.orderId )>
		<cfquery name="local.close" datasource="coredb">
			UPDATE orders SET closed = 1 WHERE id = <cfqueryparam value="#arguments.orderId#" cfsqltype="cf_sql_integer">
		</cfquery>
	</cffunction>

	<cffunction name="totalFor" access="public" returntype="numeric">
		<cfargument name="orderId" type="numeric" required="true">
		<cfquery name="local.rows" datasource="coredb">
			SELECT SUM( qty ) AS total FROM order_lines WHERE order_id = <cfqueryparam value="#arguments.orderId#" cfsqltype="cf_sql_integer">
		</cfquery>
		<cfreturn local.rows.total>
	</cffunction>

</cfcomponent>
