import fetch from "node-fetch";
import 'dotenv/config';

let PUBLIC_KEY = process.env.PUBLIC_KEY;
let PRIVATE_KEY = process.env.PRIVATE_KEY;
let FASTLANE_APPROVED_DOMAINS_CSV = process.env.FASTLANE_APPROVED_DOMAINS_CSV;
// You don't have to use GraphQL for Braintree,
// you can also use our SDKs (Java, .NET, Node.js, PHP, Python, Ruby):
// https://developer.paypal.com/braintree/docs/start/hello-server
let BRAINTREE_API_BASE_URL = "https://payments.sandbox.braintree-api.com/graphql";
//let BRAINTREE_API_BASE_URL = "https://payments.braintree-api.com/graphql";

// Routes
exports.handler = async (event) => {
    let request_body = JSON.parse(event.body);
    console.log("Received request:", request_body);

    switch (request_body.method) {
        case "fastlane_auth":
            return handle_fastlane_auth();
        case "auth":
            return handle_auth();
        case "card_order":
            return handle_card_order(request_body);
        case "create_order":
            return handle_create_order(request_body);
        case "complete_order":
            return handle_card_order(request_body);
        default:
            console.error("Invalid method:", request_body.method);
            return {
                statusCode: 400,
                body: "Invalid endpoint"
            };
    }
};

// Handle Client Token Generation for Auth
let handle_auth = async () => {
    try {
        // Generate regular client token
        let client_token = await create_client_token();
        return { statusCode: 200, body: JSON.stringify({ client_token }) };
    } catch (error) {
        console.error("Error in handle_auth:", error);
        return {
            statusCode: 500,
            body: error.toString()
        };
    }
};

// Handle Fastlane Authentication
let handle_fastlane_auth = async () => {
    try {
        // Generate Fastlane token
        let client_token = await create_client_token({ fastlane: true });
        return { statusCode: 200, body: JSON.stringify({ client_token }) };
    } catch (error) {
        console.error("Error in handle_fastlane_auth:", error);
        return {
            statusCode: 500,
            body: error.toString()
        };
    }
};

// Handle Card Order
let handle_card_order = async (request_body) => {
    try {
        let { amount, payment_source, payment_method_nonce, shipping_address } = request_body;
        let create_order_response = await charge_payment_method({ amount, payment_source, payment_method_nonce, shipping_address });

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(create_order_response)
        };
    } catch (error) {
        console.error("Error in handle_card_order:", error);
        return {
            statusCode: 500,
            body: error.toString()
        };
    }
};

// Handle Create Order
let handle_create_order = async (request_body) => {
    try {
        let { amount, payment_source, shipping_address } = request_body;
        let create_order_request = await create_order({ amount, payment_source, shipping_address });

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(create_order_request)
        };
    } catch (error) {
        console.error("Error in handle_create_order:", error);
        return {
            statusCode: 500,
            body: error.toString()
        };
    }
};

// Handle Complete Order
let handle_complete_order = async (request_body) => {
    try {
        let capture_paypal_order_response = await capture_paypal_order(request_body.order_id);
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(capture_paypal_order_response)
        };
    } catch (error) {
        console.error("Error in handle_complete_order:", error);
        return {
            statusCode: 500,
            body: error.toString()
        };
    }
};

// Capture PayPal Order
// https://developer.paypal.com/docs/api/orders/v2/#orders_capture
let capture_paypal_order = async (order_id) => {
    try {
        let access_token_response = await get_access_token();
        let access_token = access_token_response.access_token;
        let url = `${BRAINTREE_API_BASE_URL}/v2/checkout/orders/${order_id}/capture`;
        console.log("How does this work?:", url);
        let capture_request = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${access_token}`
            },
            body: "{}"
        });
        let capture_response = await capture_request.json();
        // You always want to sanitize API responses. No need to send the full
        // data dump to the client as to avoid unwanted data exposure
        let sanitized_paypal_capture_response = {
            amount: {
                value: capture_response.purchase_units[0].payments.captures[0].amount.value,
                currency: capture_response.purchase_units[0].payments.captures[0].amount.currency_code
            },
            payment_method: {}
        };
        // Check for PayPal details and set payment method accordingly
        if (capture_response.payment_source.paypal) {
            sanitized_paypal_capture_response.payment_method.type = "paypal";
            sanitized_paypal_capture_response.payment_method.details = {
                email: capture_response.payment_source.paypal.email_address
            };
        }
        // Check for Venmo details and set payment method accordingly
        if (capture_response.payment_source.venmo) {
            sanitized_paypal_capture_response.payment_method.type = "venmo";
            sanitized_paypal_capture_response.payment_method.details = {
                email: capture_response.payment_source.venmo.email_address
            };
        }
        console.log("Capture Order Response:", JSON.stringify(capture_response, null, 2));
        return sanitized_paypal_capture_response;
    } catch (error) {
        console.error("Error in capture_paypal_order:", error);
        throw error;
    }
};

// Charge Payment Method Mutation
// https://graphql.braintreepayments.com/reference/#Mutation--chargePaymentMethod
let charge_payment_method = async (request_object) => {
    try {
        let { amount, payment_source, payment_method_nonce, shipping_address } = request_object;

        // Set up the basic transaction details
        let transaction_details = {
            amount: amount,
            payment_method_nonce: payment_method_nonce,
            line_items: [{
                name: "Buy Me",
                quantity: "1",
                itemType: shipping_address ? "physical" : "digital",
                unitAmount: amount,
                totalAmount: amount
            }]
        };

        // If shipping details exist, add them to the transaction details
        // The shipping amounts and details below should come from the server and not be static code. This is just placeholder data.
        if (shipping_address) {
            transaction_details.shipping = {
                shippingAddress: {
                    streetAddress: shipping_address.address_line_1,
                    extendedAddress: shipping_address.address_line_2,
                    locality: shipping_address.admin_area_2,
                    region: shipping_address.admin_area_1,
                    postalCode: shipping_address.postal_code,
                    countryCode: shipping_address.country_code
                },
                shippingAmount: "3.50",
                shipsFromPostalCode: "85224",
                shippingMethod: "NEXT_DAY"
            };
        }

        // Prepare the payload based on payment source
        let gql_payload = {
            query: `
                mutation ChargePaymentMethod($input: ChargePaymentMethodInput!) {
                    chargePaymentMethod(input: $input) {
                        transaction {
                            id
                            status
                            amount {
                                value
                                currencyCode
                            }
                            paymentMethodSnapshot {
                                ... on CreditCardDetails {
                                    brandCode
                                    last4
                                    cardholderName
                                }
                                ... on PayPalTransactionDetails {
                                    payer {
                                        email
                                    }
                                }
                                ... on VenmoAccountDetails {
                                    username
                                }
                            }
                        }
                    }
                }
            `,
            variables: {
                input: {
                    paymentMethodId: transaction_details.payment_method_nonce,
                    transaction: {
                        amount: transaction_details.amount,
                        lineItems: transaction_details.line_items.map(item => ({
                            name: item.name,
                            quantity: item.quantity,
                            unitAmount: item.unitAmount,
                            totalAmount: item.totalAmount,
                            kind: "DEBIT",
                            itemType: item.itemType
                        })),
                        shipping: transaction_details.shipping
                    }
                }
            }
        };

        // Add payment source-specific fields if applicable
        if (payment_source === "card") {
            // Add a descriptor for card payments
            gql_payload.variables.input.transaction.descriptor = {
                name: "BIZNAME HERE*"
            };
        }

        console.log("Payload before charging payment method:", JSON.stringify(gql_payload, null, 2));

        let auth = Buffer.from(`${PUBLIC_KEY}:${PRIVATE_KEY}`).toString("base64");
        let charge_payment_request = await fetch(BRAINTREE_API_BASE_URL, {
            headers: {
                "Content-Type": "application/json",
                'Authorization': `Basic ${auth}`,
                'Braintree-Version': '2020-08-25',
            },
            method: "POST",
            body: JSON.stringify(gql_payload)
        });

        let json_response = await charge_payment_request.json();
        console.log("Charge Payment Method API Response:", JSON.stringify(json_response, null, 2));

        // You always want to sanitize API responses. No need to send the full
        // data dump to the client as to avoid unwanted data exposure
        let sanitized_response;
        if (payment_source === "card") {
            sanitized_response = {
                amount: {
                    value: json_response.data.chargePaymentMethod.transaction.amount.value,
                    currency: json_response.data.chargePaymentMethod.transaction.amount.currencyCode
                },
                payment_method: {
                    type: "card",
                    details: {
                        brand: json_response.data.chargePaymentMethod.transaction.paymentMethodSnapshot.brandCode,
                        last_digits: json_response.data.chargePaymentMethod.transaction.paymentMethodSnapshot.last4,
                        name: json_response.data.chargePaymentMethod.transaction.paymentMethodSnapshot.cardholderName
                    }
                }
            };
        } else if (payment_source === "paypal") {
            sanitized_response = {
                amount: {
                    value: json_response.data.chargePaymentMethod.transaction.amount.value,
                    currency: json_response.data.chargePaymentMethod.transaction.amount.currencyCode
                },
                payment_method: {
                    type: "paypal",
                    details: {
                        email: json_response.data.chargePaymentMethod.transaction.paymentMethodSnapshot.payer.email
                    }
                }
            };
        } else if (payment_source === "venmo") {
            sanitized_response = {
                amount: {
                    value: json_response.data.chargePaymentMethod.transaction.amount.value,
                    currency: json_response.data.chargePaymentMethod.transaction.amount.currencyCode
                },
                payment_method: {
                    type: "venmo",
                    details: {
                        username: json_response.data.chargePaymentMethod.transaction.paymentMethodSnapshot.username
                    }
                }
            };
        }
        // Add more if needed
        // https://graphql.braintreepayments.com/reference/#union--paymentmethoddetails

        return sanitized_response;

    } catch (error) {
        console.error("Error processing payment:", error);
        return {
            statusCode: 400,
            body: error.toString()
        };
    }
};


// Create Client Token
let create_client_token = async (options = { fastlane: false }) => {
    try {
        let auth = Buffer.from(`${PUBLIC_KEY}:${PRIVATE_KEY}`).toString("base64");
        let fetch_options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`,
                'Braintree-Version': '2020-08-25',
            },
            body: JSON.stringify({
                query: `mutation ($input: CreateClientTokenInput) { createClientToken(input: $input) { clientToken }}`,
                variables: {
                    input: {}
                },
            }),
        };

        // If fastlane is true, add the domains to the input
        if (options.fastlane) {
            fetch_options.body = JSON.stringify({
                query: `mutation ($input: CreateClientTokenInput) { createClientToken(input: $input) { clientToken }}`,
                variables: {
                    input: {
                        clientToken: {
                            domains: FASTLANE_APPROVED_DOMAINS_CSV.split(',')
                        },
                    },
                },
            });
        }
        
        let response = await fetch(BRAINTREE_API_BASE_URL, fetch_options);
        let data = await response.json();
        console.log("Braintree Create Client Token Response:", JSON.stringify(data, null, 2));
        if (response.ok) {
            return data.data.createClientToken.clientToken;
        } else {
            throw new Error(JSON.stringify(data.errors));
        }
    } catch (error) {
        console.error("Error in create_client_token:", error);
        throw error;
    }
};