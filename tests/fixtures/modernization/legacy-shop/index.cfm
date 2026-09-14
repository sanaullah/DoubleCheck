<cfinclude template="includes/header.cfm">
<form action="/orders/place.cfm" method="post"><input name="sku"></form>
<cfquery name="q" datasource="shop">SELECT id, sku FROM orders WHERE sku = <cfqueryparam value="#url.sku#" cfsqltype="cf_sql_varchar"></cfquery>
<cfset unsafe = queryExecute("SELECT id FROM orders WHERE sku = '#url.sku#'")>
<cfhttp url="https://example.invalid/catalog" method="get">
<cfset fileWrite(expandPath("data/order.log"), q.sku)>
