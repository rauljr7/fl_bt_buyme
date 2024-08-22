let profile_data;
let email_regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
let is_guest_payer = true;
let email_input_element = document.getElementById("email");
let identity;
let device_data;
let profile;
let FastlanePaymentComponent;
let FastlaneWatermarkComponent;
let braintree_client_token;
let braintree_client_instance;
let paypal_client_instance;
let venmo_client_instance;
let data_collector_instance;
let client_id;
let fastlane_style_object;
let script_tag;
let paypal_button;
let venmo_button;
let method;
let amount_input_element = document.getElementById("amount");
let payment_form = document.getElementById("payment_form");
let process_payment_request;
let process_payment_response;
let amount_paid;
let currency_code;
let payment_method_element = document.getElementById("payment_method");
let buyer_email_element = document.getElementById("buyer_email");
let payment_submit_button = document.getElementById("payment_submit");
let paypal_button_options;
let create_paypal_order_request;
let order_data;
let payment_fetch_options;
let order_fetch_options;
let show_card_fields_button = document.getElementById("show_card_fields");
let paypal_button_container = document.getElementById("paypal_button_container");
let venmo_button_container = document.getElementById("venmo_button_container");
let auth_flow_response;
let authentication_state;
let card_fields_container = document.getElementById("card_fields_container");
let lookup_response;
let customer_context_id;
let tokenize_response;
let tokenize_id;
let server_endpoint = "/.netlify/functions/api/"; // Replace with your own server endpoint
let payment_method_nonce;
let fastlane_options_object;
let payment_source;

// Entry point
get_auth()
    .then(response => response.json())
    .then(init_payment_options)
    .catch(error => {
        console.error("Error:", error);
    });
// Fetch an authentication token from the server to load fastlane SDK (card payments)
function get_auth() {
    return fetch(server_endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            method: "fastlane_auth"
        })
    });
}
// Initializes payment options by setting up Fastlane and PayPal buttons through Braintree SDK.
async function init_payment_options(data) {
    braintree_client_token = data.client_token;
    braintree_client_instance = await braintree.client.create({
        authorization: braintree_client_token
    });
    // Create PayPal Instance and load SDK.
    await braintree.paypalCheckout.create({
          client: braintree_client_instance
        }).then(function (paypalCheckoutInstance) {
        paypal_client_instance = paypalCheckoutInstance;
        return paypal_client_instance.loadPayPalSDK({
          currency: 'USD',
          intent: 'capture' // Fastlane only supports straight capture
        });
      });
      // Create Venmo Instance.
      await braintree.venmo.create({
        client: braintree_client_instance,
        paymentMethodUsage: 'single_use',
        allowDesktopWebLogin: true,
        allowNewBrowserTab: true,
        mobileWebFallBack: true,
    });
    let venmo_svg = `<svg id="venmo_button" width="280px" height="48px" viewBox="0 0 280 48" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <!-- //808080 //3D95CE -->
            <title>svg/blue_venmo_button_280x48</title>
            <desc>Created with Sketch.</desc>
            <defs></defs>
            <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g id="blue_venmo_button_280x48">
                    <rect fill="#3D95CE" x="0" y="0" width="280" height="48" rx="4" style="fill: rgb(61, 149, 206);"></rect>
                    <g id="Group" transform="translate(98.000000, 16.000000)" fill="#FFFFFF">
                        <path d="M14.1355722,0.0643062201 C14.6997229,0.996022242 14.9540614,1.95569119 14.9540614,3.16795034 C14.9540614,7.03443424 11.6533091,12.0572714 8.97435371,15.5842648 L2.85545503,15.5842648 L0.401435711,0.910859951 L5.75920168,0.402203543 L7.05667586,10.8432743 C8.26898429,8.86832019 9.76503373,5.76467606 9.76503373,3.64865382 C9.76503373,2.49041769 9.56660332,1.70150782 9.25650148,1.0519281 L14.1355722,0.0643062201 L14.1355722,0.0643062201 Z" id="Shape"></path>
                        <path d="M21.0794779,6.525633 C22.0654018,6.525633 24.5475201,6.07462046 24.5475201,4.66393896 C24.5475201,3.98655114 24.0685351,3.64865382 23.5040948,3.64865382 C22.5165776,3.64865382 21.2206966,4.83281521 21.0794779,6.525633 L21.0794779,6.525633 Z M20.9665029,9.31947756 C20.9665029,11.0419863 21.924328,11.7177809 23.1941378,11.7177809 C24.5769225,11.7177809 25.9009024,11.3798836 27.6217431,10.505377 L26.9735853,14.9065874 C25.7611321,15.4989577 23.8715531,15.8942092 22.0374478,15.8942092 C17.3850512,15.8942092 15.7199738,13.0728462 15.7199738,9.545708 C15.7199738,4.97417302 18.4284766,0.120067244 24.0124822,0.120067244 C27.08685,0.120067244 28.8059526,1.84243114 28.8059526,4.24073451 C28.8062423,8.10707358 23.8437439,9.29152463 20.9665029,9.31947756 L20.9665029,9.31947756 Z" id="Shape"></path>
                        <path d="M44.2677372,3.50758567 C44.2677372,4.07185827 44.1821369,4.89031424 44.0969712,5.42518557 L42.4892503,15.58412 L37.2722686,15.58412 L38.7387707,6.27159447 C38.7665799,6.01900427 38.8520354,5.51049269 38.8520354,5.22835639 C38.8520354,4.55096858 38.4288137,4.3819475 37.9199918,4.3819475 C37.2441697,4.3819475 36.5667543,4.69203673 36.1155786,4.918412 L34.4522393,15.5842648 L29.2058551,15.5842648 L31.6026627,0.374540282 L36.1433878,0.374540282 L36.2008892,1.58853744 C37.2721237,0.88319669 38.6827177,0.120356912 40.6841129,0.120356912 C43.3356936,0.120067244 44.2677372,1.47498771 44.2677372,3.50758567 L44.2677372,3.50758567 Z" id="Shape"></path>
                        <path d="M59.7554481,1.78507694 C61.2496147,0.713885943 62.6604983,0.120067244 64.6058406,0.120067244 C67.2846511,0.120067244 68.216405,1.47498771 68.216405,3.50758567 C68.216405,4.07185827 68.1310944,4.89031424 68.0459287,5.42518557 L66.4400908,15.58412 L61.2216606,15.58412 L62.7161168,6.07476529 C62.7436363,5.82058192 62.8014274,5.51049269 62.8014274,5.31380835 C62.8014274,4.55111341 62.3780609,4.3819475 61.8693838,4.3819475 C61.2213709,4.3819475 60.5736477,4.6640838 60.0927798,4.918412 L58.4297302,15.5842648 L53.2126036,15.5842648 L54.7070598,6.07491013 C54.7345794,5.82072676 54.7906323,5.51063753 54.7906323,5.31395319 C54.7906323,4.55125824 54.367121,4.38209233 53.860182,4.38209233 C53.1829115,4.38209233 52.5069445,4.69218156 52.0557688,4.91855683 L50.3911259,15.5844097 L45.1464798,15.5844097 L47.5429977,0.374685116 L52.0282492,0.374685116 L52.1691783,1.64444329 C53.2126036,0.883486357 54.6220389,0.12064658 56.511473,0.12064658 C58.1474376,0.120067244 59.2185273,0.825552826 59.7554481,1.78507694 L59.7554481,1.78507694 Z" id="Shape"></path>
                        <path d="M78.5990953,6.21583344 C78.5990953,4.97417302 78.288559,4.12761929 77.358688,4.12761929 C75.2997914,4.12761929 74.8770043,7.76743825 74.8770043,9.62942196 C74.8770043,11.0419863 75.2722719,11.9162033 76.2018532,11.9162033 C78.1479196,11.9162033 78.5990953,8.07767231 78.5990953,6.21583344 L78.5990953,6.21583344 Z M69.5751464,9.40463986 C69.5751464,4.60817794 72.1127383,0.120067244 77.9512273,0.120067244 C82.3505888,0.120067244 83.9587442,2.71679297 83.9587442,6.30099573 C83.9587442,11.0418415 81.4485271,15.9514186 75.4692539,15.9514186 C71.0415037,15.9514186 69.5751464,13.0446036 69.5751464,9.40463986 L69.5751464,9.40463986 Z" id="Shape"></path>
                    </g>
                </g>
            </g>
        </svg>`;
    venmo_button_container.innerHTML = venmo_svg;
    data_collector_instance = await braintree.dataCollector.create({
        client: braintree_client_instance
    });
    device_data = data_collector_instance.deviceData;
    init_fastlane_methods();
    paypal_button = bootstrap_standard_button({ fundingSource: "paypal", style: {
        shape: "rect",
        color: "gold",
        label: "paypal",
        height: 55
    }});
    paypal_button.render("#paypal_button_container");
}
// Initializes Fastlane methods and sets up event handlers.
async function init_fastlane_methods() {
    fastlane_style_object = {
        styles: {
            root: {
                backgroundColor: 'white',
                errorColor: 'red',
                fontFamily: 'Arial, sans-serif',
                textColorBase: 'black',
                fontSizeBase: '16px',
                padding: '10px',
                primaryColor: 'black',
            },
            input: {
                backgroundColor: 'white',
                borderRadius: '4px',
                borderColor: 'black',
                borderWidth: '1px',
                textColorBase: 'black',
                focusBorderColor: 'black',
            }
        }
    }
    fastlane = await braintree.fastlane.create({
        authorization: braintree_client_token,
        client: braintree_client_instance,
        deviceData: device_data,
        styles: fastlane_style_object
    });
    identity = fastlane.identity;
    profile = fastlane.profile;
    fastlane.setLocale('en-US');
    FastlanePaymentComponent = fastlane.FastlanePaymentComponent;
    // Fastlane watermark component
	FastlaneWatermarkComponent = await fastlane.FastlaneWatermarkComponent({ includeAdditionalInfo: true });
	FastlaneWatermarkComponent.render("#watermark-container");
    // Show all form elements now that SDK loading has completed
    ui_display_remaining_elements();
    // Set event listener to handle automatic fastlane lookup on input
    email_input_element.addEventListener("input", function() {
        handle_email_input();
    });
    //Click once to display card fields and check the user email in fastlane for first time
    show_card_fields_button.addEventListener("click", (event) => {
        if (show_card_fields_button.style.display === "block") {
            ui_handle_show_card_fields();
            fastlane_display_card_fields();
        }
    });
    // Render the fastlane component
    async function fastlane_display_card_fields() {
        // Optional UI fix
        card_fields_container.style.setProperty("width", "calc(100% - 32px)", "important");
        card_fields_container.style["margin-bottom"] = "13px";
        fastlane_options_object = {
            styles: {
                root: {
                    backgroundColor: "white",
                    errorColor: "red",
                    fontFamily: "Arial, sans-serif",
                    textColorBase: "black",
                    fontSizeBase: "16px",
                    padding: "0px",
                    primaryColor: "black",
                },
                input: {
                    backgroundColor: "white",
                    borderRadius: "4px",
                    borderColor: "#e6e6e6",
                    borderWidth: "1px",
                    textColorBase: "black",
                    focusBorderColor: "black",
                }
            },
/*          If your website has shipping inputs, you can
            pass them here to associate them with this
            new fastlane account. */
/*           shippingAddress: {
                firstName: "Jen",
                lastName: "Smith",
                company: "PayPal",
                streetAddress: "1 E 1st St",
                extendedAddress: "5th Floor",
                locality: "Bartlett",
                region: "IL",
                postalCode: "60103",
                countryCodeAlpha2: "US",
                phoneNumber: "14155551212"
                
              } */
        };
        // To use the "Flexible" Fastlane integration where you have
        // more customized UI, you can use the following instead:
        // FastlaneCardFieldComponent = await fastlane.FastlaneCardFieldComponent(fastlane_options_object);
        FastlanePaymentComponent = await fastlane.FastlanePaymentComponent(fastlane_options_object);
        FastlanePaymentComponent.render("#card_fields_container");
        setup_payment_handler(FastlanePaymentComponent);
    }
    // IF YOU HAVE SHIPPING
    async function show_shipping_address_selector() {
          let shipping_address_selector = await profile.showShippingAddressSelector();
          let selected_address = shipping_address_selector.selectedAddress;
          let selection_changed = shipping_address_selector.selectionChanged;
          //After user is done with the selection modal
          if (selection_changed) {
            // selectedAddress contains the new address
          } else {
            // Selection modal was dismissed without selection
          }
    }
    //To switch their card
    async function show_card_selector() {
          let card_selector = await profile.showCardSelector();
          let selected_card = card_selector.selectedCard;
          let selection_changed = card_selector.selectionChanged;
          //After user is done with the selection modal
          if (selection_changed) {
            // selectedCard contains the new Card
          } else {
            // Selection modal was dismissed without selection
          }
    }
    // Submit button to process payment
    function setup_payment_handler(FastlanePaymentComponent) {
        payment_submit_button.addEventListener("click", async (event) => {
            ui_submit_button_clicked();
            console.log("Payment form requested to be submitted.");
            //User typed out card info (guest)
            if (is_guest_payer) {
                tokenize_response = await FastlanePaymentComponent.getPaymentToken({
                    billingAddress: {}
                }).catch(error => {
                    console.error("Error tokenizing payment:", error);
                    revert_submit_button_ui();
                });
                console.log("tokenize response", tokenize_response);
                // Payment source type can be extracted in response
                payment_source = Object.keys(tokenize_response.paymentSource)[0];
                process_payment({ "payment_method_nonce": tokenize_response.id, "payment_source": payment_source });
            }
            //User passed OTP (fastlane user)
            else {
                process_authenticated_user();
            }
        });
    }
}
// We already have the profile data from fastlane,
// so we can process the payment. No need to display
// card fields nor tokenize any user inputs.
function process_authenticated_user() {
    // In case you want to use any of these for custom UI or receipts
    let name = profile_data.name;
    let shippingAddress = profile_data.shippingAddress;
    let card = profile_data.card;
    process_payment({ "payment_method_nonce": card.id, "payment_source": "card" });
}
// Avoid fastlane lookups of a string unless user has entered a valid email
function handle_email_input() {
    if (check_email_validity(email_input_element.value)) {
        console.log('The string "' + email_input_element.value + '" is a valid email address.');
        begin_fastlane_lookup();
    }
}
// Fastlane lookup to decide if UI should be guest payer (if email not found)
// or attempt for one-time-password (OTP) fastlane auth
async function begin_fastlane_lookup() {
    lookup_response = await identity.lookupCustomerByEmail(email_input_element.value);
    customer_context_id = lookup_response.customerContextId;
    
    if (customer_context_id) {
        handle_existing_customer(customer_context_id);
    } else {
        // Optional UI fix
        card_fields_container.style.setProperty("width", "calc(100% - 32px)", "important");
        handle_guest_payer();
    }
}
// Fastlane OTP auth if fastlane matched the email string to a profile
async function handle_existing_customer(customer_context_id) {
    auth_flow_response = await identity.triggerAuthenticationFlow(customer_context_id);
    authentication_state = auth_flow_response.authenticationState;
    // Can use profileData for "flexible" integration where you would display card details with custom UI
    profile_data = auth_flow_response.profileData;
    console.log("Profile data associated with this fastlane account:", profile_data);
    // Fastlane OTP auth passed
    if (authentication_state === "succeeded") {
        // We click to show the card fields container so that their stored card is displayed for authenticated users
        // For the "Quick Start" integration, this is built in. For "flexible" integration, you must
        // build this UI using the "profile_data" variable:
        // let name = profile_data.name;
        // let shippingAddress = profile_data.shippingAddress;
        // let card = profile_data.card;
        show_card_fields_button.click();
        is_guest_payer = false;
        console.log("Fastlane member successfully authenticated themselves");
        // Optional UI fix
        card_fields_container.style.setProperty("width", "calc(100% - 40px)", "important");
    }
    // Fastlane OTP auth did not pass, treat as guest payer
    else {
        console.log("Member failed or cancelled to authenticate. Treat them as a guest payer");
        // Optional UI fix
        card_fields_container.style.setProperty("width", "calc(100% - 32px)", "important");
        handle_guest_payer();
    }
}

function handle_guest_payer() {
    console.log("No profile found with this email address. This is a guest payer");
    is_guest_payer = true;
    // Add any other custom code that you want to occur for guest payer scenario
}
// Processes the payment using the provided tokenize ID and payment source.
async function process_payment(object) {
    payment_method_nonce = object.payment_method_nonce;
    payment_source = object.payment_source;
    console.log("Processing payment, have this profile data avail:", profile_data);
    console.log(`Processing payment with payment_method_nonce: ${payment_method_nonce} and payment_source: ${payment_source}`);
    // Set up fetch options for the API call
    payment_fetch_options = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            method: "complete_order",
            amount: amount_input_element.value,
            payment_source: payment_source,
            payment_method_nonce: payment_method_nonce
        })
    };
    try {
        console.log("Sending payment request to the server...");
        // Send the payment request to the server
        fetch(server_endpoint, payment_fetch_options)
            .then(response => response.json())
            .then((process_payment_response) => {
                ui_display_receipt(process_payment_response);
            });
    } catch (error) {
        revert_submit_button_ui();
        // Replace with your own custom UI error handling
        alert("Error processing payment. Please try again.");
        console.error("Error processing payment:", error);
    }    
}
// Initializes PayPal buttons and sets up event handlers for order creation and approval.
function bootstrap_standard_button(options_object) {
    paypal_button_options = {
        createOrder: function () {
            return paypal_client_instance.createPayment({
              flow: 'checkout', // Required
              amount: amount_input_element.value, // Required
              currency: 'USD', // Required, must match the currency passed in with loadPayPalSDK
              intent: 'capture', // Must match the intent passed in with loadPayPalSDK
                
/*              If your website has shipping inputs, you can
                pass them here to associate them with this
                new fastlane account. */
/*               shippingAddressOverride: {
                recipientName: 'Scruff McGruff',
                line1: '1234 Main St.',
                line2: 'Unit 1',
                city: 'Chicago',
                countryCode: 'US',
                postalCode: '60652',
                state: 'IL',
                phone: '123.456.7890'
              } */
            });
          },
        onApprove: function (data, actions) {
            console.log("Order approved with data:", data);
            return paypal_client_instance.tokenizePayment(data).then(async function (payload) {
                console.log("Payload:", payload);
                // Process the payment upon order approval
                try {
                    await process_payment({ "payment_method_nonce": payload.nonce, "payment_source": data.paymentSource });
                } catch (error) {
                    console.error("Error processing payment:", error);
                }
            });
        },
    };
    // Merge the provided object with the default options
    Object.assign(paypal_button_options, options_object);
    return window.paypal.Buttons(paypal_button_options);
}

// UI AND HELPER FUNCTIONS BELOW

function ui_display_receipt(process_payment_response) {
    console.log("Payment response received:", process_payment_response);
    // Hide the left and right cards
    document.getElementById("card-content-left").style.display = "none";
    document.getElementById("card-content-right").style.display = "none";
    // Show the receipt card
    document.getElementById("card-content-receipt").style.display = "block";
    // Update the receipt with the payment response information
    let amount_paid = process_payment_response.amount.value;
    let currency_code = process_payment_response.amount.currency;
    document.getElementById("amount_paid").textContent = `${amount_paid} ${currency_code}`;

    let payment_method_element = document.getElementById("payment_method");
    let buyer_email_element = document.getElementById("buyer_email");

    if (process_payment_response.payment_method.type === "card") {
        payment_method_element.textContent = `💳 ${process_payment_response.payment_method.details.brand} ending in ${process_payment_response.payment_method.details.last_digits}`;
        buyer_email_element.textContent = document.getElementById("email").value;
    } else
    if (process_payment_response.payment_method.type === "paypal" || process_payment_response.payment_method.type === "venmo") {
        payment_method_element.textContent = process_payment_response.payment_method.type.charAt(0).toUpperCase() + process_payment_response.payment_method.type.slice(1);
        buyer_email_element.textContent = process_payment_response.payment_method.details.email;
    }
}

function ui_submit_button_clicked() {
    payment_submit_button.setAttribute("disabled", true);
    payment_submit_button.value = "Loading...";
    payment_submit_button.style.setProperty("cursor", "not-allowed", "important");
}

function revert_submit_button_ui() {
    payment_submit_button.removeAttribute("disabled");
    payment_submit_button.value = "Pay Now";
    payment_submit_button.style.removeProperty("cursor");
}

function ui_display_remaining_elements() {
    document.getElementById("loading").style.display = "none";
    email_input_element.style.display = "block";
    show_card_fields_button.style.display = "block";
    paypal_button_container.style.display = "block";
    venmo_button_container.style.display = "block";
    payment_submit_button.style.display = "block";
}

function ui_handle_show_card_fields() {
    paypal_button_container.style.display = "none";
    venmo_button_container.style.display = "none";
    show_card_fields_button.style.display = "none";
}

function check_email_validity(email) {
    return email_regex.test(email);
}
// Remove default form submission behavior
payment_form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (show_card_fields_button.style.display === "block") {
        show_card_fields_button.click();
    }
});

/* Example Profile data payload:
{
    "shippingAddress": {
        "name": {
            "firstName": "John",
            "lastName": "Doe",
            "fullName": "John Doe"
        },
        "address": {
            "addressLine1": "123 Main St",
            "adminArea2": "City",
            "adminArea1": "State",
            "postalCode": "12345",
            "countryCode": "US"
        },
        "phoneNumber": {
            "nationalNumber": "5551234567",
            "countryCode": "1"
        }
    },
    "card": {
        "id": "12345678-1234-1234-1234-1234567890ab",
        "paymentSource": {
            "card": {
                "brand": "VISA",
                "expiry": "2023-12",
                "lastDigits": "1234",
                "name": "John Doe",
                "billingAddress": {
                    "addressLine1": "123 Main St",
                    "adminArea2": "City",
                    "adminArea1": "State",
                    "postalCode": "12345",
                    "countryCode": "US"
                }
            }
        }
    },
    "name": {
        "firstName": "John",
        "lastName": "Doe",
        "fullName": "John Doe"
    }
} */