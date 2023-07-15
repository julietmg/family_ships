package com.familyships.FamilyShips;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.familyships.FamilyShips.accessingdatamysql.User;
import com.familyships.FamilyShips.accessingdatamysql.UserRepository;

@RestController
public class HelloController {

    @Autowired // This means to get the bean called userRepository
         // Which is auto-generated by Spring, we will use it to handle the data
  private UserRepository userRepository;

    @RequestMapping("/hello")
    public String hello() {
        String result = " <script src=\"/OrgChart.js\"></script>" +
                "<div style=\"width:100%; height:700px;\" id=\"tree\"></div>\n" +
                " <script>\n" +
                "        var chart = new OrgChart(document.getElementById(\"tree\"), {\n" +
                "            nodeBinding: {\n" +
                "                field_0: \"name\"\n" +
                "            },\n" + 
                "            nodes: [\n" + 
                "{ id: 1, name: \"Julia Geborys-Mika\" },\n";
        int nextId = 2;
        for (User user : userRepository.findAll()) {
            result += "{ id: " + nextId + ", pid:1, name: \"" + user.getName() + "\"},";
            nextId++;
        }
        result += "{ id: " + nextId + ", name: \"Maksymilian Mika\" }  \n";
        result += "            ]\n" +
                "        });\n" +
                "    </script> ";
        System.out.println(result);
        return result;
                
    }
}
