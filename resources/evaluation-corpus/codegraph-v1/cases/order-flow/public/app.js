export async function loadOrders() {
    const response = await fetch( "/api/v1/orders" );
    return response.json();
}
