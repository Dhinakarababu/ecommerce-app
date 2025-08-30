// Cart functionality
document.addEventListener('DOMContentLoaded', function() {
    // Add to cart buttons
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            addToCart(productId, 1);
        });
    });
    
    // Quantity changes in cart
    const quantityInputs = document.querySelectorAll('.quantity-input');
    quantityInputs.forEach(input => {
        input.addEventListener('change', function() {
            const itemId = this.getAttribute('data-id');
            updateCartItem(itemId, this.value);
        });
    });
    
    // Checkout form submission
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', function(e) {
            e.preventDefault();
            placeOrder();
        });
    }
});

function addToCart(productId, quantity) {
    fetch('/add-to-cart', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            productId: productId,
            quantity: quantity
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Product added to cart!');
            updateCartCount();
        } else {
            if (data.message === 'Please login first') {
                window.location.href = '/login';
            } else {
                alert('Error: ' + data.message);
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function updateCartItem(itemId, quantity) {
    fetch('/update-cart', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            itemId: itemId,
            quantity: quantity
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            location.reload();
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function updateCartCount() {
    // This would typically be implemented with a cart count API endpoint
    // For simplicity, we'll just reload the page
    location.reload();
}

function placeOrder() {
    const formData = new FormData(document.getElementById('checkout-form'));
    const data = {
        name: formData.get('name'),
        address: formData.get('address'),
        city: formData.get('city'),
        zip: formData.get('zip'),
        cardNumber: formData.get('cardNumber'),
        expDate: formData.get('expDate'),
        cvv: formData.get('cvv')
    };
    
    fetch('/place-order', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = '/order/' + data.orderId;
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}