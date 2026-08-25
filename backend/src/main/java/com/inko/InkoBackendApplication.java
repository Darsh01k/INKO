package com.inko;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class InkoBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(InkoBackendApplication.class, args);
	}

}
