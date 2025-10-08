document.addEventListener('DOMContentLoaded', () => {

    // --- State for the cart ---
    let cart = [];

    // --- Selectors ---
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const menuItems = document.querySelectorAll('.menu-item');
    const sliderImages = document.querySelectorAll('.slider-img');
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const addToCartBtns = document.querySelectorAll('.add-to-cart-btn');
    const cartIcon = document.getElementById('cart-icon');
    const cartModal = document.getElementById('cart-modal');
    const closeModalBtn = document.querySelector('.close-btn');
    const cartCounter = document.getElementById('cart-counter');
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceEl = document.getElementById('total-price');
    const sendOrderBtn = document.getElementById('send-order-btn');
    
    // 1. Mobile Navigation
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('nav-active');
        hamburger.classList.toggle('toggle');
    });
    
    document.querySelectorAll('.nav-links li a').forEach(link => {
        link.addEventListener('click', () => {
            if (navLinks.classList.contains('nav-active')) {
                navLinks.classList.remove('nav-active');
                hamburger.classList.remove('toggle');
            }
        });
    });

    // 2. Menu Filtering
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filterValue = btn.getAttribute('data-filter');
            menuItems.forEach(item => {
                item.classList.remove('is-active');
                if (filterValue === 'all' || item.getAttribute('data-category') === filterValue) {
                    item.classList.remove('hide');
                } else {
                    item.classList.add('hide');
                }
            });
        });
    });

    // 3. Hero Section Image Slider
    if (sliderImages.length > 0) {
        let currentSlide = 0;
        function nextSlide() {
            sliderImages[currentSlide].classList.remove('active');
            currentSlide = (currentSlide + 1) % sliderImages.length;
            sliderImages[currentSlide].classList.add('active');
        }
        setInterval(nextSlide, 5000);
    }
    
    // 4. Dark/Light Theme Toggle
    function setTheme(theme) {
        if (theme === 'dark') {
            body.classList.add('dark-mode');
            themeToggle.textContent = '☀️';
            localStorage.setItem('theme', 'dark');
        } else {
            body.classList.remove('dark-mode');
            themeToggle.textContent = '🌙';
            localStorage.setItem('theme', 'light');
        }
    }
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) { setTheme(savedTheme); }
    themeToggle.addEventListener('click', () => {
        setTheme(body.classList.contains('dark-mode') ? 'light' : 'dark');
    });

    // 5. Interactive Menu for Mobile
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const isActive = item.classList.contains('is-active');
            menuItems.forEach(i => i.classList.remove('is-active'));
            if (!isActive) { item.classList.add('is-active'); }
        });
    });

    // 6. Shopping Cart Logic
    function updateCart() {
        cartItemsContainer.innerHTML = '';
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p>سلتك فارغة حاليًا.</p>';
        } else {
            cart.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.classList.add('cart-item');
                itemEl.innerHTML = `
                    <div class="cart-item-details">
                        <h4>${item.name}</h4>
                        <p>${item.price} ريال</p>
                    </div>
                    <div class="cart-item-controls">
                        <button class="quantity-btn" data-name="${item.name}" data-action="decrease">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn" data-name="${item.name}" data-action="increase">+</button>
                    </div>
                `;
                cartItemsContainer.appendChild(itemEl);
            });
        }
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        totalPriceEl.textContent = total;
        const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCounter.textContent = totalQuantity;
    }

    function addToCart(name, price) {
        const existingItem = cart.find(item => item.name === name);
        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({ name: name, price: parseFloat(price), quantity: 1 });
        }
        updateCart();
    }
    
    function changeQuantity(name, action) {
        const item = cart.find(item => item.name === name);
        if (item) {
            if (action === 'increase') {
                item.quantity++;
            } else if (action === 'decrease') {
                item.quantity--;
                if (item.quantity === 0) {
                    cart = cart.filter(cartItem => cartItem.name !== name);
                }
            }
        }
        updateCart();
    }

    addToCartBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const name = btn.dataset.name;
            const price = btn.dataset.price;
            addToCart(name, price);
            btn.textContent = 'تمت الإضافة!';
            setTimeout(() => { btn.textContent = 'أضف للطلب'; }, 1000);
        });
    });

    cartIcon.addEventListener('click', () => { cartModal.style.display = 'block'; });
    closeModalBtn.addEventListener('click', () => { cartModal.style.display = 'none'; });
    window.addEventListener('click', (e) => {
        if (e.target == cartModal) { cartModal.style.display = 'none'; }
    });
    
    cartItemsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('quantity-btn')) {
            const name = e.target.dataset.name;
            const action = e.target.dataset.action;
            changeQuantity(name, action);
        }
    });

    sendOrderBtn.addEventListener('click', () => {
        if (cart.length === 0) {
            alert('سلتك فارغة! الرجاء إضافة بعض المنتجات أولاً.');
            return;
        }

        let invoice = `*فاتورة طلب جديد من موقع تكا بليت* 🔥\n\n`;
        invoice += `-----------------------------------\n`;
        invoice += `*الطلبات:*\n`;
        cart.forEach(item => {
            invoice += `*- (${item.quantity})* ${item.name} | *${item.price * item.quantity} ريال*\n`;
        });
        invoice += `-----------------------------------\n`;
        invoice += `*الإجمالي: ${totalPriceEl.textContent} ريال*\n\n`;
        invoice += `(هذا الطلب تم إرساله من الموقع الإلكتروني، نرجو تأكيده مع العميل)`;

        const restaurantNumber = '966554242136';
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${restaurantNumber}&text=${encodeURIComponent(invoice)}`;
        
        const link = document.createElement('a');
        link.href = whatsappUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});
