<!--- Dynamic include: the resolver cannot follow this, and must say so. --->
<cfinclude template="modules/#url.module#/handler.cfm">

<cfset svc = createObject( "component", "OrderService" )>
<cfset svc.finalize( url.orderId )>

<!--- Dynamic SQL identifier. --->
<cfquery name="audit" datasource="coredb">
	SELECT * FROM #url.auditTable# WHERE order_id = <cfqueryparam value="#url.orderId#" cfsqltype="cf_sql_integer">
</cfquery>
