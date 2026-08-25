package com.inko.identity.service;

import com.inko.identity.domain.Role;
import com.inko.identity.domain.RoleName;
import com.inko.identity.domain.User;
import com.inko.identity.domain.UserStatus;
import com.inko.identity.repo.RoleRepository;
import com.inko.identity.repo.UserRepository;
import com.inko.shops.domain.Shop;
import com.inko.shops.domain.ShopStatus;
import com.inko.shops.repo.ShopRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Seeds obviously-fake development accounts/shops so every role can be exercised locally.
 * Each item is created only if missing, so partial states self-heal.
 * NEVER enable in production (inko.app.seed-dev-data=false).
 */
@Component
public class DevDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);

    private final UserRepository users;
    private final RoleRepository roles;
    private final ShopRepository shops;
    private final PasswordEncoder encoder;
    private final boolean enabled;

    public DevDataSeeder(UserRepository users,
                         RoleRepository roles,
                         ShopRepository shops,
                         PasswordEncoder encoder,
                         org.springframework.core.env.Environment env) {
        this.users = users;
        this.roles = roles;
        this.shops = shops;
        this.encoder = encoder;
        this.enabled = env.getProperty("inko.app.seed-dev-data", Boolean.class, true);
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!enabled) {
            return;
        }

        ensureUser("Dev Super Admin", "superadmin@inko.local", null,
                "SuperAdmin@Dev123", RoleName.SUPER_ADMIN);
        ensureUser("Dev Admin", "admin@inko.local", "+919000000000",
                "Admin@Dev123", RoleName.ADMIN);
        User keeperOne = ensureUser("Keeper One", "keeper1@inko.local", "+919000000001",
                "Keeper@Dev123", RoleName.SHOPKEEPER);
        User keeperTwo = ensureUser("Keeper Two", "keeper2@inko.local", "+919000000002",
                "Keeper@Dev123", RoleName.SHOPKEEPER);
        ensureUser("Customer One", "customer1@inko.local", "+919000000003",
                "Customer@Dev123", RoleName.CUSTOMER);

        ensureShop("Inko Xerox Point", keeperOne.getId(), "Mysuru");
        ensureShop("Campus Print Hub", keeperTwo.getId(), "Bengaluru");
    }

    private User ensureUser(String name, String email, String phone, String rawPassword, RoleName roleName) {
        return users.findByEmailIgnoreCase(email).orElseGet(() -> {
            User u = new User(name, email, phone, encoder.encode(rawPassword), UserStatus.ACTIVE);
            u.getRoles().add(role(roleName));
            users.save(u);
            return u;
        });
    }

    private void ensureShop(String name, UUID ownerId, String city) {
        if (shops.findByName(name).isPresent()) {
            return;
        }
        Shop s = new Shop();
        s.setName(name);
        s.setOwnerUserId(ownerId);
        s.setCity(city);
        s.setStatus(ShopStatus.OPEN);
        shops.save(s);
    }

    private Role role(RoleName name) {
        return roles.findByName(name)
                .orElseThrow(() -> new IllegalStateException("Missing seeded role " + name));
    }
}
