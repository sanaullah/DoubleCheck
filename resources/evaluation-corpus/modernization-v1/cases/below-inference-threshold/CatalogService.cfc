<cfcomponent output="false" hint="Domain A. Under the folder-inference threshold, but a real seam.">

	<cfset this.datasource = "shopdb">

	<cffunction name="listProducts" access="public" returntype="query">
		<cfquery name="local.rows" datasource="shopdb">
			SELECT sku, title FROM products WHERE active = 1
		</cfquery>
		<cfreturn local.rows>
	</cffunction>

	<cffunction name="priceFor" access="public" returntype="numeric">
		<cfargument name="sku" type="string" required="true">
		<cfset var pricing = createObject( "component", "PricingRules" )>
		<cfreturn pricing.apply( arguments.sku )>
	</cffunction>

</cfcomponent>
