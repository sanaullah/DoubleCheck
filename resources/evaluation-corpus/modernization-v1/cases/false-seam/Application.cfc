<cfcomponent output="false" hint="Shared lifecycle state both folders depend on.">

	<cfset this.name = "falseSeamFixture">
	<cfset this.datasource = "ledgerdb">
	<cfset this.sessionManagement = true>

	<cffunction name="onApplicationStart" access="public" returntype="boolean">
		<cfset application.billingRates = {}>
		<cfset application.reportingCache = {}>
		<cfreturn true>
	</cffunction>

	<cffunction name="onSessionStart" access="public" returntype="void">
		<cfset session.user = { tenantId: "", isLoggedIn: false }>
	</cffunction>

	<cffunction name="isLoggedIn" access="public" returntype="boolean">
		<cfreturn structKeyExists( session, "user" ) AND session.user.isLoggedIn>
	</cffunction>

</cfcomponent>
