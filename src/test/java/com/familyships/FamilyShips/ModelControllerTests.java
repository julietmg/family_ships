package com.familyships.FamilyShips;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;
import com.familyships.FamilyShips.model.FamilyChildRepository;
import com.familyships.FamilyShips.model.FamilyParentRepository;
import com.familyships.FamilyShips.model.FamilyRepository;
import com.familyships.FamilyShips.model.Person;
import com.familyships.FamilyShips.model.PersonRepository;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.verify;


@ExtendWith(SpringExtension.class)
@SpringBootTest
@AutoConfigureMockMvc
public class ModelControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PersonRepository personRepository;
    @MockBean
    private FamilyRepository familyRepository;
    @MockBean
    private FamilyChildRepository familyChildRepository;
    @MockBean
    private FamilyParentRepository familyParentRepository;

    @Test
    void testPeople() throws Exception {
        // TODO: Add more tests.
        given(personRepository.save(any())).willAnswer((invocation)-> {
            Person person = (Person) invocation.getArguments()[0];
            person.setId(1);
            return person;
        });

        mockMvc.perform(MockMvcRequestBuilders.post("/model/new_person").contentType("text/html;charset=UTF-8")
                .param("name", "Robert")
                .with(SecurityMockMvcRequestPostProcessors.user("Julia")))
                .andExpect(MockMvcResultMatchers.status().isOk());

        verify(personRepository).save(argThat(p -> p.getNames().toArray()[0].equals("Robert")));
    }

}
