<cfcomponent output="false" hint="Domain A collaborator. Touches only catalog tables.">

	<cfset this.datasource = "shopdb">

	<cffunction name="apply" access="public" returntype="numeric">
		<cfargument name="sku" type="string" required="true">
		<cfquery name="local.rows" datasource="shopdb">
			SELECT base_price FROM product_prices WHERE sku = <cfqueryparam value="#arguments.sku#" cfsqltype="cf_sql_varchar">
		</cfquery>
		<cfreturn local.rows.base_price>
	</cffunction>

</cfcomponent>
