<cfcomponent output="false" hint="Writes the four tables and the session/application state reporting reads.">

	<cfset this.datasource = "ledgerdb">

	<cffunction name="issueInvoice" access="public" returntype="numeric">
		<cfargument name="customerId" type="numeric" required="true">
		<cfargument name="total" type="numeric" required="true">
		<cfquery name="local.insert" datasource="ledgerdb">
			INSERT INTO invoices ( customer_id, total )
			VALUES (
				<cfqueryparam value="#arguments.customerId#" cfsqltype="cf_sql_integer">,
				<cfqueryparam value="#arguments.total#" cfsqltype="cf_sql_decimal">
			)
		</cfquery>
		<cfquery name="local.touch" datasource="ledgerdb">
			UPDATE customers SET last_invoiced_at = <cfqueryparam value="#now()#" cfsqltype="cf_sql_timestamp">
			WHERE id = <cfqueryparam value="#arguments.customerId#" cfsqltype="cf_sql_integer">
		</cfquery>
		<cfreturn 1>
	</cffunction>

	<cffunction name="recordPayment" access="public" returntype="void">
		<cfargument name="invoiceId" type="numeric" required="true">
		<cfquery name="local.pay" datasource="ledgerdb">
			INSERT INTO payments ( invoice_id ) VALUES (
				<cfqueryparam value="#arguments.invoiceId#" cfsqltype="cf_sql_integer">
			)
		</cfquery>
		<cfquery name="local.post" datasource="ledgerdb">
			INSERT INTO ledger ( entry_type ) VALUES ( 'payment' )
		</cfquery>
	</cffunction>

	<cffunction name="refreshRates" access="public" returntype="void">
		<!--- Writes the application state reporting depends on. --->
		<cfset application.billingRates = { standard: 1.0 }>
		<cfset session.user.lastBillingTouch = now()>
	</cffunction>

</cfcomponent>
