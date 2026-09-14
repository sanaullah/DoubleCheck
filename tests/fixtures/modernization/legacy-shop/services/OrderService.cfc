component {
    property name="datasource" inject="shop";
    remote query function findBySku(required string sku) returntype="query" {
        return queryExecute("SELECT id, sku FROM orders WHERE sku = :sku", { sku: { value: arguments.sku, sqltype: "varchar" } });
    }
    function construct(required string componentName) { return createObject("component", arguments.componentName); }
    function dynamic(required string name) { return evaluate(arguments.name); }
}
