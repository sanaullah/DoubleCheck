<cfcomponent output="false" hint="Looks like a standalone reporting domain. It is not.">

	<cfset this.datasource = "ledgerdb">

	<cffunction name="revenueByMonth" access="public" returntype="query">
		<cfargument name="monthStart" type="date" required="true">
		<!--- Shares invoices + customers with billing. --->
		<cfquery name="local.rows" datasource="ledgerdb">
			SELECT i.total, c.segment
			FROM invoices i
			JOIN customers c ON c.id = i.customer_id
			WHERE i.issued_at >= <cfqueryparam value="#arguments.monthStart#" cfsqltype="cf_sql_timestamp">
		</cfquery>
		<cfreturn local.rows>
	</cffunction>

	<cffunction name="outstandingBalances" access="public" returntype="query">
		<!--- payments and ledger too: four shared tables, not one. --->
		<cfquery name="local.rows" datasource="ledgerdb">
			SELECT p.amount, l.entry_type
			FROM payments p
			JOIN ledger l ON l.payment_id = p.id
		</cfquery>
		<cfreturn local.rows>
	</cffunction>

	<cffunction name="currentUserScope" access="private" returntype="string">
		<!--- Reads the same session keys billing writes. --->
		<cfif isLoggedIn() AND structKeyExists( session, "user" )>
			<cfreturn session.user.tenantId>
		</cfif>
		<cfreturn "">
	</cffunction>

	<cffunction name="cachedRates" access="private" returntype="struct">
		<!--- Reads application state that BillingService populates. --->
		<cfreturn application.billingRates>
	</cffunction>

</cfcomponent>
