<!--- A scheduled job writing what the request path also writes. --->
<cfschedule action="update" task="nightly-close" interval="86400" url="http://localhost/reporting/nightly-close.cfm">

<cfset billing = createObject( "component", "BillingService" )>
<cfset billing.refreshRates()>

<!--- Unparameterised: built by string concatenation. --->
<cfquery name="stale" datasource="ledgerdb">
	DELETE FROM ledger WHERE entry_type = '#url.entryType#'
</cfquery>

<cfset fileWrite( expandPath( "./logs/nightly-close.log" ), "closed" )>
